import datetime
import os
import time
from typing import Optional
from io import BytesIO

import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from PIL import Image

import ai_service
import camera_module
import trash_classifier

app = Flask(__name__)
CORS(app)

app.config["JSON_SORT_KEYS"] = False

DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.environ.get("MYSQL_PORT", "3306")),
    "user": os.environ.get("MYSQL_USER", "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
    "database": os.environ.get("MYSQL_DATABASE", "ecosmart"),
}

CONFIDENCE_THRESHOLD = 0.7
REWARD_POINTS = 3000

# OpenAI Configuration
OPENAI_API_KEY = os.environ.get(
    "OPENAI_API_KEY",
    "sk-proj-1hIz61nUGq_5fEk3yvOEoNbaFGhb@IH_Jw6P2wx5s7RmUn2EoeAwcW_TcNGADvchkka7NyVCXWT3BlbkFJJe"
)
openai_client = None
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

LOCATION_RULES = [
    ("192.168.1.", "Gedung A"),
    ("192.168.0.", "Gedung B"),
    ("10.0.0.", "Gedung C"),
    ("127.0.0.1", "Laptop Lokal"),
]

BIN_STATE = {
    "status": "siap",
    "distance_cm": None,
    "updated_at": None,
}

PENDING_REGISTRATION = {
    "rfid_uid": None,
    "timestamp": None,
}

# Global Session Management
current_active_session = None


def _get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def _map_label_to_command(label: str) -> str:
    normalized = label.upper()
    if "KERTAS" in normalized or "TISU" in normalized:
        return "KERTAS"
    if "ANORGANIK" in normalized:
        return "ANORGANIK"
    return "UNKNOWN"


def _map_ip_to_location(ip_address: str) -> str:
    if not ip_address:
        return "Lokasi Tidak Diketahui"
    for prefix, name in LOCATION_RULES:
        if ip_address.startswith(prefix):
            return name
    return "Sektor Terluar"


def _update_bin_state(status: str, distance: Optional[float] = None) -> dict:
    BIN_STATE["status"] = status or BIN_STATE["status"]
    if distance is not None:
        try:
            BIN_STATE["distance_cm"] = float(distance)
        except (ValueError, TypeError):
            BIN_STATE["distance_cm"] = None
    BIN_STATE["updated_at"] = datetime.datetime.now().isoformat()
    return BIN_STATE


def _set_pending_registration(rfid_uid: str):
    PENDING_REGISTRATION["rfid_uid"] = rfid_uid
    PENDING_REGISTRATION["timestamp"] = datetime.datetime.now().isoformat()


def _classify_image(image_path: str):
    """
    Klasifikasi gambar menggunakan TensorFlow saja (tidak pakai Gemini untuk scan).
    Gemini hanya untuk chatbot.
    """
    local_result = trash_classifier.predict_image(image_path)
    label = local_result.get("label", "ERROR")
    confidence = float(local_result.get("confidence", 0.0))
    analysis = {"used": "local", "details": local_result}

    # Hanya gunakan TensorFlow - tidak ada fallback Gemini untuk mempercepat response
    # Jika confidence rendah, tetap gunakan hasil TensorFlow
    if label == "ERROR":
        label = "ANORGANIK"  # Default fallback
        confidence = 0.5

    confidence = max(0.0, min(confidence, 1.0))

    return label, confidence, analysis


def _build_stats(cursor):
    cursor.execute(
        "SELECT COUNT(*) AS total FROM trash_logs WHERE trash_type IN ('KERTAS', 'ANORGANIK')"
    )
    total = cursor.fetchone()["total"]
    cursor.execute(
        "SELECT trash_type, COUNT(*) AS cnt FROM trash_logs WHERE trash_type IN ('KERTAS', 'ANORGANIK') GROUP BY trash_type"
    )
    type_counts = {row["trash_type"]: row["cnt"] for row in cursor.fetchall()}
    cursor.execute(
        "SELECT IFNULL(location_ip, 'Tidak Diketahui') AS location, COUNT(*) AS cnt "
        "FROM trash_logs "
        "WHERE trash_type IN ('KERTAS', 'ANORGANIK') "
        "GROUP BY location ORDER BY cnt DESC LIMIT 5"
    )
    location_chart = [
        {"location": row["location"], "count": row["cnt"]}
        for row in cursor.fetchall()
    ]
    return {
        "total_logs": total,
        "kertas": type_counts.get("KERTAS", 0),
        "anorganik": type_counts.get("ANORGANIK", 0),
        "location_chart": location_chart,
    }


def _format_logs(log_rows):
    formatted = []
    for row in log_rows:
        timestamp = row["timestamp"]
        formatted.append(
            {
                "id": row["id"],
                "timestamp": timestamp.isoformat() if timestamp else None,
                "trash_type": row["trash_type"],
                "confidence": row["confidence"],
                "location_ip": row["location_ip"] or "Tidak Diketahui",
                "user_name": row["user_name"],
                "rfid_uid": row["rfid_uid"],
                "user_role": row.get("user_role"),
                "user_prodi": row.get("user_prodi"),
            }
        )
    return formatted


def _fetch_dashboard_data():
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        stats = _build_stats(cursor)
        cursor.execute(
            "SELECT id, rfid_uid, name, role, prodi, saldo FROM users ORDER BY saldo DESC LIMIT 5"
        )
        leaderboard = cursor.fetchall()
        cursor.execute(
            "SELECT id, rfid_uid, name, role, prodi, saldo FROM users ORDER BY name"
        )
        users = cursor.fetchall()
        cursor.execute(
            """
            SELECT
                l.id,
                l.timestamp,
                l.trash_type,
                l.confidence,
                l.location_ip,
                u.name AS user_name,
                u.rfid_uid,
                u.role AS user_role,
                u.prodi AS user_prodi
            FROM trash_logs l
            JOIN users u ON u.id = l.user_id
            ORDER BY l.timestamp DESC
            LIMIT 20
            """
        )
        recent_logs = _format_logs(cursor.fetchall())
        # Get last scan for user dashboard - filter out logout/role logs like program lama
        last_scan = None
        if recent_logs:
            for log in recent_logs:
                trash_type = log.get("trash_type", "")
                # Skip logout and role login logs - only get actual trash scans
                if "LOGOUT" not in trash_type and not trash_type.startswith("ROLE_"):
                    last_scan = log
                    break
        
        payload = {
            "stats": stats,
            "leaderboard": leaderboard,
            "users": users,
            "recent_logs": recent_logs,
            "last_scan": last_scan,  # Last actual trash scan, not logout
            "pending_registration": PENDING_REGISTRATION.copy() if PENDING_REGISTRATION.get("rfid_uid") else None,
            "bin_state": BIN_STATE.copy(),
        }
        return payload
    finally:
        cursor.close()
        conn.close()


def _fetch_chat_stats():
    conn = _get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        stats = _build_stats(cursor)
        return stats
    finally:
        cursor.close()
        conn.close()


@app.route("/")
def home():
    return "EcoSmart.AI Backend siaga! 🚀"


@app.route("/api/scan-rfid", methods=["POST"])
def scan_rfid():
    global current_active_session  # Declare global at the start of function
    
    payload = request.get_json(silent=True) or {}
    card_id = str(payload.get("card_id", "")).strip().upper()
    distance_cm = payload.get("distance_cm")
    if not card_id:
        return jsonify({"status": "invalid", "message": "card_id kosong"}), 400

    conn = _get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE rfid_uid = %s", (card_id,))
        user = cursor.fetchone()
        if not user:
            # Smart Registration: Set session ke REGISTERING
            current_active_session = {
                "status": "REGISTERING",
                "rfid_uid": card_id,
                "timestamp": datetime.datetime.now().isoformat(),
            }
            _set_pending_registration(card_id)
            return jsonify(
                {
                    "status": "unregistered",
                    "esp_command": "UNKNOWN",
                    "card_id": card_id,
                    "message": "RFID belum terdaftar, silakan registrasi",
                }
            ), 404

        location_label = _map_ip_to_location(request.remote_addr or "")

        # Set active session for all roles
        current_active_session = {
            "user_id": user["id"],
            "rfid_uid": user["rfid_uid"],
            "name": user["name"],
            "role": user["role"],
            "prodi": user.get("prodi"),
            "saldo": user["saldo"],
            "timestamp": datetime.datetime.now().isoformat(),
        }

        if user["role"] in {"admin", "petugas"}:
            role_log_type = f"ROLE_{user['role'].upper()}"
            log_entry = {
                "timestamp": datetime.datetime.now().isoformat(),
                "trash_type": role_log_type,
                "confidence": 1.0,
                "location_ip": location_label,
            }
            _update_bin_state("siap")
            cursor.execute(
                """
                INSERT INTO trash_logs (user_id, trash_type, confidence, location_ip)
                VALUES (%s, %s, %s, %s)
                """,
                (user["id"], role_log_type, 1.0, location_label),
            )
            conn.commit()
            return jsonify(
                {
                    "status": "role_login",
                    "role": user["role"],
                    "esp_command": "NO_ACTION",
                    "message": f"Login sebagai {user['role']}.",
                    "user": {
                        "id": user["id"],
                        "rfid_uid": user["rfid_uid"],
                        "name": user["name"],
                        "role": user["role"],
                        "prodi": user.get("prodi"),
                        "saldo": user["saldo"],
                    },
                    "location": location_label,
                    "log": log_entry,
                }
            )

        # FIX: Delay 2 detik sebelum capture untuk biarkan frontend redirect dulu
        print("⏳ [SCAN] Menunggu 2 detik untuk frontend redirect...")
        time.sleep(2)
        
        image_path = camera_module.take_picture()
        if not image_path:
            return (
                jsonify(
                    {"status": "cam_error", "message": "Kamera gagal menangkap gambar"}
                ),
                503,
            )

        label, confidence, analysis = _classify_image(image_path)
        esp_command = _map_label_to_command(label)
        _update_bin_state("terisi", distance_cm)

        new_saldo = user["saldo"] + REWARD_POINTS
        cursor.execute(
            "UPDATE users SET saldo = %s WHERE id = %s", (new_saldo, user["id"])
        )
        cursor.execute(
            """
            INSERT INTO trash_logs (user_id, trash_type, confidence, location_ip)
            VALUES (%s, %s, %s, %s)
            """,
            (user["id"], label, confidence, location_label),
        )
        conn.commit()

        log_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "trash_type": label,
            "confidence": confidence,
            "location_ip": location_label,
        }
        return jsonify(
            {
                "status": "success",
                "esp_command": esp_command,
                "label": label,
                "confidence": confidence,
                "model_source": analysis.get("used"),
                "analysis": analysis,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "role": user["role"],
                    "saldo": new_saldo,
                },
                "location": location_label,
                "log": log_entry,
            }
        )
    finally:
        cursor.close()
        conn.close()


@app.route("/api/bin-status", methods=["GET", "POST"])
def bin_status():
    payload = request.get_json(silent=True) or {}
    if request.method == "POST":
        _update_bin_state(payload.get("status") or BIN_STATE["status"], payload.get("distance_cm"))
    return jsonify(BIN_STATE.copy())


@app.route("/api/bin-update", methods=["POST"])
def bin_update():
    """Endpoint untuk ESP32 mengirim update jarak ultrasonic secara real-time"""
    try:
        payload = request.get_json(silent=True) or {}
        distance_cm = payload.get("distance_cm")
        status = payload.get("status", "terisi")
        
        if distance_cm is None:
            return jsonify({"status": "error", "message": "distance_cm required"}), 400
        
        # Validate distance_cm is a number
        try:
            distance_cm = float(distance_cm)
            if distance_cm < 0 or distance_cm > 1000:
                return jsonify({"status": "error", "message": "distance_cm out of range"}), 400
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "distance_cm must be a number"}), 400
        
        _update_bin_state(status, distance_cm)
        return jsonify({
            "status": "success",
            "bin_state": BIN_STATE.copy()
        })
    except Exception as exc:
        print(f"❌ [BIN-UPDATE] Error: {exc}")
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/check-session", methods=["GET"])
def check_session():
    """Endpoint for frontend polling to check active session"""
    global current_active_session
    if current_active_session:
        # Handle REGISTERING status
        if current_active_session.get("status") == "REGISTERING":
            return jsonify({
                "active": True,
                "status": "REGISTERING",
                "rfid_uid": current_active_session.get("rfid_uid"),
            })
        # Handle normal session
        if "role" in current_active_session:
            return jsonify({
                "active": True,
                "role": current_active_session["role"],
                "user": {
                    "id": current_active_session.get("user_id"),
                    "rfid_uid": current_active_session.get("rfid_uid"),
                    "name": current_active_session.get("name"),
                    "role": current_active_session.get("role"),
                    "prodi": current_active_session.get("prodi"),
                    "saldo": current_active_session.get("saldo"),
                    "timestamp": current_active_session.get("timestamp"),  # Include timestamp for logout check
                },
            })
    return jsonify({"active": False})


@app.route("/api/logout", methods=["POST"])
def logout():
    """Clear active session and log logout event - like program lama"""
    global current_active_session
    payload = request.get_json(silent=True) or {}
    rfid_uid = str(payload.get("rfid_uid", "")).strip().upper()
    role = payload.get("role", "user")
    
    # Clear session FIRST - important!
    current_active_session = None
    
    if not rfid_uid:
        return jsonify({"status": "success", "message": "Session cleared"})

    conn = _get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE rfid_uid = %s", (rfid_uid,))
        user = cursor.fetchone()
        if user:
            location_label = _map_ip_to_location(request.remote_addr or "")
            cursor.execute(
                """
                INSERT INTO trash_logs (user_id, trash_type, confidence, location_ip)
                VALUES (%s, %s, %s, %s)
                """,
                (user["id"], f"ROLE_{role.upper()}_LOGOUT", 1.0, location_label),
            )
            conn.commit()
        _update_bin_state("siap")
        return jsonify({"status": "success", "message": "Logout berhasil"})
    except Exception as exc:
        print(f"❌ [LOGOUT] Error: {exc}")
        # Even if error, session is cleared, so return success
        return jsonify({"status": "success", "message": "Session cleared"})
    finally:
        cursor.close()
        conn.close()


@app.route("/api/dashboard-data", methods=["GET"])
def dashboard_data():
    payload = _fetch_dashboard_data()
    return jsonify(payload)


@app.route("/api/register-user", methods=["POST"])
def register_user():
    payload = request.get_json(silent=True) or {}
    rfid_uid = str(payload.get("rfid_uid", "")).strip().upper()
    name = payload.get("name", "").strip()
    role = payload.get("role", "user")
    prodi = payload.get("prodi", "")

    if not rfid_uid or not name:
        return jsonify({"status": "invalid", "message": "rfid_uid & name wajib"}), 400

    if role not in {"admin", "user", "petugas"}:
        return jsonify({"status": "invalid", "message": "role tidak valid"}), 400

    conn = _get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO users (rfid_uid, name, role, prodi)
            VALUES (%s, %s, %s, %s)
            """,
            (rfid_uid, name, role, prodi),
        )
        conn.commit()
        cursor.execute(
            "SELECT id, rfid_uid, name, role, prodi, saldo FROM users WHERE rfid_uid = %s",
            (rfid_uid,),
        )
        user = cursor.fetchone()
        return jsonify({"status": "success", "user": user}), 201
    except mysql.connector.errors.IntegrityError as exc:
        if exc.errno == mysql.connector.errorcode.ER_DUP_ENTRY:
            return jsonify({"status": "exists", "message": "RFID sudah terdaftar"}), 409
        raise
    finally:
        cursor.close()
        conn.close()


@app.route("/api/create-user", methods=["POST"])
def create_user():
    """Endpoint untuk Smart Registration - membuat user baru dari RFID yang belum terdaftar"""
    payload = request.get_json(silent=True) or {}
    rfid_uid = str(payload.get("rfid_uid", "")).strip().upper()
    name = payload.get("name", "").strip()
    username = payload.get("username", "").strip()
    prodi = payload.get("prodi", "").strip()
    role = payload.get("role", "user")  # Default role adalah user

    # Validasi
    if not rfid_uid:
        return jsonify({"status": "error", "message": "RFID UID wajib"}), 400
    if not name:
        return jsonify({"status": "error", "message": "Nama lengkap wajib"}), 400
    if not username:
        return jsonify({"status": "error", "message": "Username wajib"}), 400

    if role not in {"admin", "user", "petugas"}:
        role = "user"

    conn = _get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Cek apakah RFID sudah terdaftar
        cursor.execute("SELECT * FROM users WHERE rfid_uid = %s", (rfid_uid,))
        existing_user = cursor.fetchone()
        if existing_user:
            return jsonify({"status": "error", "message": "RFID sudah terdaftar"}), 409

        # Insert user baru
        cursor.execute(
            """
            INSERT INTO users (rfid_uid, name, username, role, prodi, saldo)
            VALUES (%s, %s, %s, %s, %s, 0)
            """,
            (rfid_uid, name, username, role, prodi),
        )
        conn.commit()

        # Ambil data user yang baru dibuat
        cursor.execute(
            "SELECT id, rfid_uid, name, username, role, prodi, saldo FROM users WHERE rfid_uid = %s",
            (rfid_uid,),
        )
        new_user = cursor.fetchone()

        # Clear session REGISTERING
        global current_active_session
        current_active_session = None

        return jsonify({
            "status": "success",
            "message": "User berhasil didaftarkan",
            "user": new_user,
        }), 201
    except mysql.connector.errors.IntegrityError as exc:
        if exc.errno == mysql.connector.errorcode.ER_DUP_ENTRY:
            return jsonify({"status": "error", "message": "RFID sudah terdaftar"}), 409
        return jsonify({"status": "error", "message": f"Database error: {str(exc)}"}), 500
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Error: {str(exc)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/chat-gemini", methods=["POST"])
def chat_gemini():
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    if not question:
        return jsonify({"status": "invalid", "message": "Pertanyaan wajib"}), 400

    stats = _fetch_chat_stats()
    answer = ai_service.ask_gemini(question, stats)
    return jsonify({"status": "success", "answer": answer, "stats": stats})


@app.route("/api/chat-openai", methods=["POST"])
def chat_openai():
    """OpenAI Chatbot endpoint for Admin Dashboard"""
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    if not question:
        return jsonify({"status": "invalid", "message": "Pertanyaan wajib"}), 400

    if not openai_client:
        # Fallback to Gemini if OpenAI not available
        try:
            stats = _fetch_chat_stats()
            answer = ai_service.ask_gemini(question, stats)
            return jsonify({"status": "success", "answer": answer, "source": "gemini"})
        except Exception as exc:
            return jsonify({"status": "error", "message": f"AI service tidak tersedia: {str(exc)}"}), 500

    try:
        stats = _fetch_chat_stats()
        context = f"Total sampah: {stats.get('total_logs', 0)}, Kertas: {stats.get('kertas', 0)}, Anorganik: {stats.get('anorganik', 0)}"
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "Kamu adalah EcoSmart Assistant. Jawab singkat, ramah, dan edukatif tentang sampah."
                },
                {
                    "role": "user",
                    "content": f"Konteks: {context}\n\nPertanyaan: {question}"
                }
            ],
            max_tokens=200,
            temperature=0.7,
        )
        
        answer = response.choices[0].message.content.strip()
        return jsonify({"status": "success", "answer": answer, "source": "openai"})
    except Exception as exc:
        print(f"❌ [CHAT-OPENAI] Error: {exc}")
        # Fallback to Gemini on error
        try:
            stats = _fetch_chat_stats()
            answer = ai_service.ask_gemini(question, stats)
            return jsonify({"status": "success", "answer": answer, "source": "gemini_fallback"})
        except Exception as gemini_exc:
            return jsonify({"status": "error", "message": f"AI service error: {str(exc)}"}), 500


@app.route("/api/mvp-leaderboard", methods=["GET"])
def mvp_leaderboard():
    """Get MVP leaderboard grouped by Prodi"""
    conn = _get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT 
                prodi,
                COUNT(DISTINCT u.id) as total_users,
                SUM(u.saldo) as total_saldo,
                AVG(u.saldo) as avg_saldo,
                MAX(u.saldo) as max_saldo
            FROM users u
            WHERE u.role = 'user' AND u.prodi IS NOT NULL
            GROUP BY prodi
            ORDER BY total_saldo DESC, avg_saldo DESC
            """
        )
        leaderboard = cursor.fetchall()
        
        # Get top users per prodi
        cursor.execute(
            """
            SELECT 
                u.id,
                u.name,
                u.prodi,
                u.saldo,
                u.rfid_uid
            FROM users u
            WHERE u.role = 'user' AND u.prodi IS NOT NULL
            ORDER BY u.prodi, u.saldo DESC
            """
        )
        all_users = cursor.fetchall()
        
        # Group users by prodi
        prodi_users = {}
        for user in all_users:
            prodi = user["prodi"]
            if prodi not in prodi_users:
                prodi_users[prodi] = []
            prodi_users[prodi].append(user)
        
        return jsonify({
            "status": "success",
            "leaderboard": leaderboard,
            "users_by_prodi": prodi_users,
        })
    finally:
        cursor.close()
        conn.close()


@app.cli.command("fresh")
def clear_logs():
    """Hapus log sampah untuk persiapan demo/testing."""
    conn = _get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM trash_logs")
        conn.commit()
        print("✅ Trash logs cleared.")
    finally:
        cursor.close()
        conn.close()


@app.route("/api/scan-trash", methods=["POST"])
def scan_trash():
    """Endpoint untuk frontend mengirim gambar dari kamera real-time untuk klasifikasi"""
    global current_active_session
    
    if not current_active_session or current_active_session.get("role") != "user":
        return jsonify({"status": "error", "message": "Session tidak valid"}), 401
    
    if "image" not in request.files:
        return jsonify({"status": "error", "message": "Gambar tidak ditemukan"}), 400
    
    file = request.files["image"]
    if file.filename == "":
        return jsonify({"status": "error", "message": "File kosong"}), 400

    try:
        # Save image temporarily
        image_data = file.read()
        image = Image.open(BytesIO(image_data))
        temp_path = "static/captures/scan_realtime.jpg"
        os.makedirs("static/captures", exist_ok=True)
        image.save(temp_path, "JPEG")
        
        # Classify using model .h5
        label, confidence, analysis = _classify_image(temp_path)
        
        # Map label to command
        esp_command = _map_label_to_command(label)
        
        # Get user from session
        conn = _get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM users WHERE id = %s", (current_active_session["user_id"],))
            user = cursor.fetchone()
            
            if user:
                new_saldo = user["saldo"] + REWARD_POINTS
                cursor.execute("UPDATE users SET saldo = %s WHERE id = %s", (new_saldo, user["id"]))
                location_label = _map_ip_to_location(request.remote_addr or "")
                cursor.execute(
                    """
                    INSERT INTO trash_logs (user_id, trash_type, confidence, location_ip)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user["id"], label, confidence, location_label),
                )
                conn.commit()
                
                return jsonify({
                    "status": "success",
                    "label": label,
                    "confidence": confidence,
                    "esp_command": esp_command,
                    "model_source": analysis.get("used"),
                    "points": REWARD_POINTS,
                    "new_saldo": new_saldo,
                    "analysis": analysis,
                })
        finally:
            cursor.close()
            conn.close()
            
    except Exception as exc:
        print(f"❌ [SCAN-TRASH] Error: {exc}")
        return jsonify({"status": "error", "message": str(exc)}), 500


if __name__ == "__main__":
    trash_classifier.load_model_once()
    print("🔥 EcoSmart.AI Backend siap di port 5001.")
    app.run(host="0.0.0.0", port=5001, debug=True)
import mysql.connector
from mysql.connector import errorcode
import os

DB_NAME = os.environ.get("ECOSMART_DB", "ecosmart")
DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.environ.get("MYSQL_PORT", "3306")),
    "user": os.environ.get("MYSQL_USER", "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
}


def _connect(use_database: bool = False):
    params = DB_CONFIG.copy()
    if use_database:
        params["database"] = DB_NAME
    return mysql.connector.connect(**params)


def create_database():
    print(f"🔧 Membuat database '{DB_NAME}' jika belum ada...")
    conn = _connect(use_database=False)
    conn.autocommit = True
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        print("✅ Database siap.")
    finally:
        cursor.close()
        conn.close()


def create_tables():
    conn = _connect(use_database=True)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rfid_uid VARCHAR(128) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255),
                role ENUM('admin','user','petugas') NOT NULL DEFAULT 'user',
                prodi VARCHAR(255),
                saldo INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS trash_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                trash_type VARCHAR(64) NOT NULL,
                confidence FLOAT NOT NULL DEFAULT 0,
                location_ip VARCHAR(255),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
        )
        conn.commit()
        print("✅ Tabel users & trash_logs siap.")
    finally:
        cursor.close()
        conn.close()


def seed_users():
    users = [
        ("E3915625", "Super Admin", "admin", "admin", "Office", 0),
        ("834E07F5", "Pak Budi", "petugas", "petugas", "Petugas Lapangan (WA: 081332007987)", 0),
        ("C9F79E6E", "Muhammad Rayhan Ramadhan", "rayhan", "user", "S1 Sistem Informasi", 0),
        ("F9140C6E", "Darvesh Gladwin Musyaffa", "gladwin", "user", "S1 Sistem Informasi", 0),
    ]

    conn = _connect(use_database=True)
    cursor = conn.cursor()
    try:
        # Cek apakah kolom username ada
        cursor.execute("SHOW COLUMNS FROM users LIKE 'username'")
        has_username = cursor.fetchone() is not None
        
        for user_data in users:
            if has_username:
                rfid, name, username, role, prodi, saldo = user_data
                cursor.execute(
                    """
                    INSERT INTO users (rfid_uid, name, username, role, prodi, saldo)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), username=VALUES(username), role=VALUES(role), prodi=VALUES(prodi)
                    """,
                    (rfid, name, username, role, prodi, saldo),
                )
            else:
                rfid, name, _, role, prodi, saldo = user_data
                cursor.execute(
                    """
                    INSERT INTO users (rfid_uid, name, role, prodi, saldo)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), prodi=VALUES(prodi)
                    """,
                    (rfid, name, role, prodi, saldo),
                )
        conn.commit()
        print("✅ Seed user selesai.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    try:
        create_database()
        create_tables()
        seed_users()
    except mysql.connector.Error as exc:
        if exc.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("❌ Akses ditolak. Periksa username/password MySQL.")
        elif exc.errno == errorcode.ER_BAD_DB_ERROR:
            print("❌ Database tidak ditemukan.")
        else:
            print(f"❌ Terjadi error MySQL: {exc}")


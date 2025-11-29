import mysql.connector

from app import _get_connection


def reset_trash_data():
    conn = _get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM trash_logs")
        cursor.execute("UPDATE users SET saldo = 0")
        conn.commit()
        print("✅ Data log & saldo berhasil direset.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    try:
        reset_trash_data()
    except mysql.connector.Error as exc:
        print(f"❌ Gagal reset data: {exc}")


"""
Script untuk menambahkan kolom username ke tabel users jika belum ada
Jalankan sekali setelah update migrate_db.py
"""
import mysql.connector
import os

DB_CONFIG = {
    "host": os.environ.get("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.environ.get("MYSQL_PORT", "3306")),
    "user": os.environ.get("MYSQL_USER", "root"),
    "password": os.environ.get("MYSQL_PASSWORD", ""),
    "database": os.environ.get("MYSQL_DATABASE", "ecosmart"),
}

def add_username_column():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    try:
        # Cek apakah kolom username sudah ada
        cursor.execute("SHOW COLUMNS FROM users LIKE 'username'")
        if cursor.fetchone():
            print("✅ Kolom username sudah ada, skip...")
            return
        
        # Tambahkan kolom username
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN username VARCHAR(255) AFTER name
        """)
        conn.commit()
        print("✅ Kolom username berhasil ditambahkan!")
    except mysql.connector.Error as e:
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    add_username_column()


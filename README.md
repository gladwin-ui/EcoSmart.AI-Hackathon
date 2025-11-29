# 🌍 EcoSmart.AI - Smart Waste Management System

<div align="center">

![EcoSmart.AI Logo](https://img.shields.io/badge/EcoSmart.AI-Smart%20Waste%20Management-green?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![ESP32](https://img.shields.io/badge/ESP32-Arduino-orange?style=for-the-badge&logo=arduino)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=for-the-badge&logo=tensorflow)

**Sistem Manajemen Sampah Pintar dengan AI Sorting, Gamifikasi Poin, dan Dashboard Real-time**

[Features](#-features) • [Architecture](#-system-architecture) • [Installation](#-installation) • [API](#-api-documentation) • [Hardware](#-hardware-setup)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [Hardware Setup](#-hardware-setup)
- [User Roles & Flow](#-user-roles--flow)
- [AI Classification](#-ai-classification)
- [Troubleshooting](#-troubleshooting)
- [Contributors](#-contributors)

---

## 🎯 Overview

**EcoSmart.AI** adalah sistem manajemen sampah pintar berbasis IoT yang menggabungkan:
- **AI-Powered Sorting**: Klasifikasi sampah otomatis menggunakan TensorFlow
- **Gamifikasi**: Sistem poin dan leaderboard untuk mendorong partisipasi
- **Real-time Monitoring**: Dashboard untuk admin dan petugas
- **Touchless Interface**: RFID-based authentication tanpa sentuhan

### Key Features

✅ **AI Trash Classification** - TensorFlow model untuk klasifikasi sampah (Kertas/Tisu vs Anorganik)  
✅ **RFID Authentication** - Login tanpa sentuhan menggunakan kartu RFID  
✅ **Automatic Sorting** - Servo motor untuk pemilahan sampah otomatis  
✅ **Real-time Bin Monitoring** - Ultrasonic sensor untuk monitoring kapasitas tong  
✅ **Gamification System** - Poin reward dan leaderboard per prodi  
✅ **Multi-role Dashboard** - Admin, User, dan Petugas dengan fitur berbeda  
✅ **OpenAI Chatbot** - Asisten AI untuk edukasi sampah (Admin)  

---

## 🚨 Problem Statement

Tantangan yang dihadapi dalam manajemen sampah:

1. **Rendahnya Pemilahan Sampah**
   - Masyarakat kurang memahami cara memilah sampah
   - Tidak ada insentif untuk memilah sampah dengan benar

2. **Inefisiensi Pengangkutan**
   - Petugas tidak tahu kapan tong sampah penuh
   - Monitoring manual tidak efisien

3. **Kurangnya Data**
   - Tidak ada tracking aktivitas sampah
   - Sulit menganalisis pola dan tren

---

## 💡 Solution

**EcoSmart.AI** menyelesaikan masalah tersebut dengan:

1. **AI Sorting Otomatis**
   - Kamera laptop menangkap gambar sampah
   - TensorFlow model mengklasifikasi jenis sampah
   - Servo motor memilah sampah ke tempat yang tepat

2. **Gamifikasi & Reward**
   - User mendapat poin setiap kali membuang sampah
   - Leaderboard per prodi untuk kompetisi sehat
   - Reward poin dapat ditukar (future feature)

3. **Real-time Monitoring**
   - Ultrasonic sensor mengukur kapasitas tong
   - Dashboard real-time untuk admin dan petugas
   - Alert otomatis saat tong hampir penuh

4. **Touchless & Hygienic**
   - RFID card untuk login tanpa sentuhan
   - Proses otomatis mengurangi kontak fisik

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Welcome    │  │    Admin     │  │    User      │         │
│  │    Page      │  │  Dashboard   │  │  Dashboard   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  React Frontend  │
                    │   (Port 5173)    │
                    └────────┬────────┘
                             │ HTTP/REST API
                    ┌────────▼────────┐
                    │ Flask Backend   │
                    │  (Port 5001)    │
                    │                 │
                    │  ┌──────────┐  │
                    │  │TensorFlow│  │  ┌──────────┐
                    │  │  Model   │  │  │  MySQL  │
                    │  └──────────┘  │  │Database │
                    │  ┌──────────┐  │  └─────────┘
                    │  │  OpenCV  │  │
                    │  │  Camera  │  │
                    │  └──────────┘  │
                    └────────┬────────┘
                             │ HTTP POST
                    ┌────────▼────────┐
                    │   ESP32 Device  │
                    │                 │
                    │  ┌──────────┐  │
                    │  │   RFID   │  │
                    │  │  Reader  │  │
                    │  └──────────┘  │
                    │  ┌──────────┐  │
                    │  │Ultrasonic│  │
                    │  │  Sensor  │  │
                    │  └──────────┘  │
                    │  ┌──────────┐  │
                    │  │  Servo   │  │
                    │  │  Motors  │  │
                    │  └──────────┘  │
                    └─────────────────┘
```

### Component Interaction Flow

```
1. USER TAP RFID
   └─> ESP32 membaca UID
       └─> POST /api/scan-rfid
           └─> Backend identifikasi role/user
               ├─> Jika ADMIN/PETUGAS: Set session, return role
               └─> Jika USER: 
                   ├─> Delay 2 detik (untuk frontend redirect)
                   ├─> Ambil foto dari webcam
                   ├─> TensorFlow klasifikasi
                   ├─> Update saldo user
                   └─> Return command ke ESP32
                       └─> ESP32 gerakkan servo sesuai command

2. FRONTEND POLLING
   └─> GET /api/check-session (setiap 1 detik)
       └─> Jika session aktif: Redirect ke dashboard sesuai role
       └─> Jika session tidak aktif: Tetap di welcome page

3. REAL-TIME MONITORING
   └─> ESP32 baca ultrasonic sensor (setiap 2 detik)
       └─> POST /api/bin-update
           └─> Backend update BIN_STATE
               └─> Frontend polling GET /api/bin-status
```

---

## 🛠️ Tech Stack

### Frontend
- **React.js 18+** - UI Framework
- **Vite** - Build tool & dev server
- **Tailwind CSS 3** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Axios** - HTTP client
- **React Router** - Routing

### Backend
- **Python 3.10+** - Programming language
- **Flask** - Web framework
- **MySQL Connector** - Database driver
- **TensorFlow 2.x** - AI/ML framework
- **OpenCV (cv2)** - Computer vision
- **OpenAI API** - Chatbot service
- **PIL (Pillow)** - Image processing

### Hardware
- **ESP32 Dev Module** - Microcontroller
- **MFRC522** - RFID reader module
- **HC-SR04** - Ultrasonic sensor
- **SG90 Servo Motors** (x2) - Actuators
- **Arduino IDE** - Development environment

### Database
- **MySQL 8.0+** - Relational database

---

## 📋 Requirements

### Software Requirements

#### Backend
- Python 3.10 atau 3.11 (tidak support 3.12+ karena TensorFlow)
- MySQL Server 8.0+
- Webcam / OBS Virtual Camera
- Git

#### Frontend
- Node.js 18+ dan npm
- Modern web browser (Chrome, Firefox, Edge)

#### Hardware
- ESP32 Dev Module
- MFRC522 RFID Reader
- HC-SR04 Ultrasonic Sensor
- SG90 Servo Motors (2x)
- Jumper wires
- Breadboard
- Power supply untuk ESP32

### System Requirements

- **OS**: Windows 10/11, macOS, atau Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Network**: WiFi untuk ESP32 dan Laptop dalam satu jaringan

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Backend Setup

```bash
cd ecosmart-backend

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup database MySQL
# 1. Buat database 'ecosmart'
# 2. Update DB_CONFIG di app.py sesuai MySQL Anda
# 3. Run migration:
python migrate_db.py

# Jalankan server
python app.py
```

Backend akan berjalan di `http://localhost:5001`

### 3. Frontend Setup

```bash
cd ecosmart-frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 4. Hardware Setup (ESP32)

1. Install **Arduino IDE** dan **ESP32 Board Support**
2. Install libraries:
   - `MFRC522` (by GithubCommunity)
   - `ESP32Servo`
   - `ArduinoJson`
3. Buka `arduino_code/HEKATONEZZ_NEW.ino`
4. Update konfigurasi:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const String serverUrl = "http://YOUR_LAPTOP_IP:5001";
   ```
5. Upload ke ESP32

### 5. Database Schema

```sql
CREATE DATABASE ecosmart;

USE ecosmart;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid_uid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    role ENUM('user', 'admin', 'petugas') DEFAULT 'user',
    prodi VARCHAR(100),
    saldo INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trash_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trash_type VARCHAR(50),
    confidence FLOAT,
    location_ip VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5001
```

### Endpoints

#### 1. `POST /api/scan-rfid`
Scan RFID dan klasifikasi sampah (untuk user) atau login (untuk admin/petugas).

**Request:**
```json
{
  "card_id": "C9F79E6E",
  "distance_cm": 23
}
```

**Response (User):**
```json
{
  "status": "success",
  "esp_command": "KERTAS",
  "label": "Kertas/Tisu",
  "confidence": 0.95,
  "user": {
    "id": 1,
    "rfid_uid": "C9F79E6E",
    "name": "John Doe",
    "role": "user",
    "prodi": "Teknik Informatika",
    "saldo": 3000
  }
}
```

**Response (Admin/Petugas):**
```json
{
  "status": "role_login",
  "role": "admin",
  "esp_command": "NO_ACTION",
  "user": { ... }
}
```

#### 2. `GET /api/check-session`
Cek session aktif (untuk frontend polling).

**Response:**
```json
{
  "active": true,
  "role": "user",
  "user": {
    "id": 1,
    "rfid_uid": "C9F79E6E",
    "name": "John Doe",
    "role": "user",
    "timestamp": "2025-11-29T10:30:00"
  }
}
```

atau

```json
{
  "active": false
}
```

#### 3. `POST /api/logout`
Logout dan clear session.

**Request:**
```json
{
  "rfid_uid": "C9F79E6E",
  "role": "user"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Session cleared"
}
```

#### 4. `POST /api/bin-update`
Update status tong sampah (dipanggil oleh ESP32).

**Request:**
```json
{
  "distance_cm": 23,
  "status": "AMAN"
}
```

#### 5. `GET /api/bin-status`
Get status tong sampah saat ini.

**Response:**
```json
{
  "status": "siap",
  "distance_cm": 23.5,
  "updated_at": "2025-11-29T10:30:00"
}
```

#### 6. `POST /api/chat-openai`
Chat dengan OpenAI chatbot (Admin only).

**Request:**
```json
{
  "message": "Apa itu sampah organik?"
}
```

#### 7. `GET /api/mvp-leaderboard`
Get leaderboard MVP per prodi.

**Response:**
```json
{
  "leaderboard": [
    {
      "prodi": "Teknik Informatika",
      "total_points": 15000,
      "user_count": 5
    }
  ]
}
```

---

## 🔌 Hardware Setup

### Pin Mapping ESP32

| Komponen | Pin ESP32 | Keterangan |
|----------|-----------|------------|
| Servo 1 (Pintu Utama) | GPIO 13 | Buka/tutup pintu utama |
| Servo 2 (Pemilah) | GPIO 25 | Pemilah kiri/kanan |
| Ultrasonic Trig | GPIO 27 | Trigger sensor |
| Ultrasonic Echo | GPIO 26 | Echo sensor |
| RFID SDA (SS) | GPIO 21 | SPI |
| RFID SCK | GPIO 18 | SPI |
| RFID MOSI | GPIO 23 | SPI |
| RFID MISO | GPIO 19 | SPI |
| RFID RST | GPIO 22 | Reset |

### Wiring Diagram

```
ESP32                    Components
─────────────────────────────────────────
GPIO 13  ──────────────> Servo 1 (Signal)
GPIO 25  ──────────────> Servo 2 (Signal)
GPIO 27  ──────────────> HC-SR04 Trig
GPIO 26  ──────────────> HC-SR04 Echo
GPIO 21  ──────────────> MFRC522 SDA
GPIO 18  ──────────────> MFRC522 SCK
GPIO 23  ──────────────> MFRC522 MOSI
GPIO 19  ──────────────> MFRC522 MISO
GPIO 22  ──────────────> MFRC522 RST
5V       ──────────────> Servo 1/2 (VCC)
5V       ──────────────> MFRC522 (3.3V)
5V       ──────────────> HC-SR04 (VCC)
GND      ──────────────> Common Ground
```

### Servo Positions

**Servo 1 (Pintu Utama):**
- `0°` = Tutup
- `90°` = Buka

**Servo 2 (Pemilah):**
- `0°` = KERTAS/TISU
- `90°` = Netral
- `180°` = ANORGANIK

### Logic Flow (ESP32)

1. **Idle State**: Menunggu tap RFID
2. **RFID Detected**: 
   - Baca UID
   - Cek jarak ultrasonic
   - Jika jarak ≤ 5cm → Status PENUH, tolak akses
   - Jika aman → Kirim POST ke backend
3. **Backend Response**:
   - Jika `role_login` + `role == "petugas"` → Jalankan `operateServoPetugas()`
   - Jika `role_login` + role lain → Tidak ada aksi
   - Jika `success` → Jalankan `operateServo(command)`
4. **Servo Operation**:
   - **User**: Buka Servo 1 → Tunggu 3s → Gerak Servo 2 sesuai command → Reset
   - **Petugas**: Buka Servo 1 (1 menit) → Servo 2 ke KERTAS (30s) → Servo 2 ke ANORGANIK (30s) → Reset

---

## 👥 User Roles & Flow

### 1. Welcome Page (Idle State)

- **Frontend**: Menampilkan welcome screen dengan instruksi "Tempelkan Kartu RFID"
- **Backend**: `current_active_session = None`
- **Behavior**: Frontend polling `/api/check-session` setiap 1 detik

### 2. User Flow

1. **RFID Scan** → ESP32 kirim POST `/api/scan-rfid`
2. **Backend**:
   - Delay 2 detik (untuk frontend redirect)
   - Ambil foto dari webcam
   - TensorFlow klasifikasi
   - Update saldo user (+3000 poin)
   - Return command ke ESP32
3. **ESP32**: Gerakkan servo sesuai command
4. **Frontend**: 
   - Redirect ke `/user` (KioskScan)
   - Tampilkan camera feed
   - Tampilkan hasil scan dan poin
   - Auto logout setelah 13 detik

### 3. Admin Flow

1. **RFID Scan** → Backend return `role_login` dengan `role: "admin"`
2. **Frontend**: Redirect ke `/admin` (Dashboard)
3. **Features**:
   - Analytics & Charts
   - OpenAI Chatbot
   - Bin Status Monitor
   - Leaderboard
   - Settings (WA to Pengepul)
4. **Logout**: Manual via tombol → Clear session → Redirect ke `/welcome`

### 4. Petugas Flow

1. **RFID Scan** → Backend return `role_login` dengan `role: "petugas"`
2. **ESP32**: Jalankan `operateServoPetugas()`:
   - Servo 1 buka selama 1 menit
   - Servo 2 ke KERTAS (30 detik pertama)
   - Servo 2 ke ANORGANIK (30 detik kedua)
3. **Frontend**: Redirect ke `/petugas` (Dashboard)
4. **Features**:
   - Bin Status Indicator (AMAN/PENUH)
   - Countdown Timer (60 detik)
   - Button "SAYA SUDAH BERSIHKAN"
5. **Logout**: Auto setelah 60 detik atau manual

---

## 🤖 AI Classification

### Model Information

- **Model**: `model_sampah_csv_custom.h5`
- **Framework**: TensorFlow/Keras
- **Architecture**: Custom CNN (trained on custom dataset)
- **Input Size**: 224x224 pixels
- **Classes**: 
  - `Kertas/Tisu` (Index 1)
  - `Anorganik Lain` (Index 0)

### Classification Flow

```
1. Camera Capture (OpenCV)
   └─> Resize to 224x224
       └─> Normalize (0-1)
           └─> TensorFlow Predict
               └─> Map to Label
                   └─> Return Command
```

### Confidence Threshold

- **Threshold**: 0.73
- Jika confidence ≥ 0.73 → `KERTAS`
- Jika confidence < 0.73 → `ANORGANIK`

### Performance

- **Inference Time**: ~200-500ms (tergantung hardware)
- **Accuracy**: Trained on custom dataset
- **Fallback**: Jika model error, default ke `ANORGANIK`

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Camera tidak terdeteksi
- **Solution**: 
  - Pastikan OBS Virtual Camera aktif (index 0)
  - Atau ubah `PREFERRED_INDICES` di `camera_module.py`
  - Cek dengan `python cek_kamera.py`

**Problem**: TensorFlow model tidak load
- **Solution**:
  - Pastikan Python 3.10 atau 3.11 (tidak support 3.12+)
  - Cek file `models/model_sampah_csv_custom.h5` ada
  - Reinstall TensorFlow: `pip install tensorflow==2.15.0`

**Problem**: MySQL connection error
- **Solution**:
  - Pastikan MySQL server running
  - Update `DB_CONFIG` di `app.py`
  - Cek database `ecosmart` sudah dibuat

### Frontend Issues

**Problem**: Redirect loop di welcome page
- **Solution**:
  - Cek `useSessionPolling.js` - pastikan `logoutTimestampRef` logic benar
  - Clear browser cache
  - Restart dev server

**Problem**: Camera tidak muncul di user dashboard
- **Solution**:
  - Pastikan browser permission untuk camera
  - Cek `navigator.mediaDevices.getUserMedia` support
  - Pastikan OBS Virtual Camera aktif

### Hardware Issues

**Problem**: ESP32 tidak connect ke WiFi
- **Solution**:
  - Cek SSID dan password di `.ino`
  - Pastikan ESP32 dan Laptop dalam satu WiFi
  - Cek IP address Laptop (update di `serverUrl`)

**Problem**: Servo tidak bergerak
- **Solution**:
  - Cek wiring (Signal, VCC, GND)
  - Cek power supply (servo butuh 5V cukup)
  - Test dengan `servo.write(90)` manual

**Problem**: RFID tidak terdeteksi
- **Solution**:
  - Cek wiring SPI (SDA, SCK, MOSI, MISO, RST)
  - Pastikan kartu RFID dalam range (2-5cm)
  - Test dengan Serial Monitor

---

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid_uid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    role ENUM('user', 'admin', 'petugas') DEFAULT 'user',
    prodi VARCHAR(100),
    saldo INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Trash Logs Table

```sql
CREATE TABLE trash_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trash_type VARCHAR(50),
    confidence FLOAT,
    location_ip VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🎨 UI/UX Design

### Color Palette

- **Welcome Page**: White, Gray (#F3F4F6), Nature Green accents
- **Admin Dashboard**: Navy Blue / Indigo (Professional)
- **User Dashboard**: Emerald Green (Eco-friendly)
- **Petugas Dashboard**: Amber / Orange (Alert concept)

### Typography

- **Font**: Inter / Poppins
- **Style**: Clean, readable, friendly

### Components

- **Welcome Page**: Fullscreen background, floating icons, Framer Motion animations
- **Admin Dashboard**: Sidebar navigation, charts, chatbot interface
- **User Dashboard**: Immersive kiosk mode, camera feed, scan results
- **Petugas Dashboard**: Big indicators, countdown timer, action buttons

---

## 🔐 Security Considerations

- **RFID UID**: Stored securely in database
- **Session Management**: In-memory session (cleared on logout)
- **API Endpoints**: CORS enabled for local development
- **Database**: SQL injection prevention via parameterized queries
- **Future**: Add JWT authentication for production

---

## 🚧 Future Enhancements

- [ ] JWT-based authentication
- [ ] Mobile app (React Native)
- [ ] Reward redemption system
- [ ] Multi-location support
- [ ] Advanced analytics dashboard
- [ ] Email/SMS notifications
- [ ] QR code alternative to RFID
- [ ] Multi-language support

---

## 📝 License

This project is developed for Hackathon purposes.

---

## 👨‍💻 Contributors

**Tim EcoSmart.AI**

- Backend Development
- Frontend Development
- Hardware Integration
- AI/ML Model Training

---

## 📞 Support

Untuk pertanyaan atau issue, silakan buat issue di repository atau hubungi tim development.

---

<div align="center">

**Made with ❤️ for a Greener Future**

🌱 **EcoSmart.AI** - Smart Waste Management System

</div>


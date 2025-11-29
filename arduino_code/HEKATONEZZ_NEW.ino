/*
  PROJECT: EcoSmart.AI - IoT Final (Updated Logic)
  BOARD: ESP32 Dev Module
  
  WIRING:
  - Servo 1 (Pintu Utama)   -> GPIO 13
  - Servo 2 (Pintu Pemilah) -> GPIO 25
  - Trig Ultra              -> GPIO 27
  - Echo Ultra              -> GPIO 26
  - RFID SDA (21), SCK (18), MOSI (23), MISO (19), RST (22)
  
  ALUR LOGIKA BARU:
  1. Standby Mode: ESP32 menunggu tap RFID.
  2. Login Process: Saat RFID di-tap, kirim POST ke /api/scan-rfid dengan body {"card_id": "UID"}.
  3. Bin Check: Sebelum membuka pintu, cek sensor Ultrasonic. Jika jarak <= 5cm, jangan buka pintu, kirim status 'PENUH'. Jika aman, kirim status 'AMAN'.
  4. Sorting Flow: Setelah kirim data user, ESP32 menunggu perintah balik dari Backend. Jika Backend membalas jenis sampah, gerakkan Servo Utama (D13) buka, tunggu 3 detik, lalu gerakkan Servo Pemilah (D25) ke arah yang sesuai.
  5. Real-time Update: Kirim data jarak Ultrasonic secara berkala (tiap 2 detik) ke endpoint /api/bin-update.
*/

#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- 1. KONFIGURASI WIFI & SERVER ---
const char* ssid     = "wiinn";      // GANTI DENGAN WIFI HP/LAPTOP
const char* password = "malesahh";  // GANTI PASSNYA
const String serverUrl = "http://10.81.7.144:5001";  // Ganti dengan IP Laptop Anda

// --- 2. KONFIGURASI PIN ---
#define SS_PIN      21
#define RST_PIN     22
#define SERVO1_PIN  13  // Pintu Utama
#define SERVO2_PIN  25  // Pintu Pemilah
#define TRIG_PIN    27  // Trig Ultrasonic
#define ECHO_PIN    26  // Echo Ultrasonic

// --- 3. VARIABEL & KONSTANTA ---
const int BATAS_PENUH = 5; // cm
const int SERVO_PRIMARY_DELAY = 5;  // Reduced from 20ms to 5ms for faster movement
const int SERVO_SECONDARY_DELAY = 5; // Reduced from 12ms to 5ms for faster movement
const unsigned long ULTRASONIC_UPDATE_INTERVAL = 2000; // 2 detik

// Setting Posisi Servo
const int TUTUP_UTAMA  = 0;
const int BUKA_UTAMA   = 90;
// Servo 2 (Pemilah) Mapping:
// Posisi 1: KERTAS/TISU -> 0 derajat
// Posisi 2: ANORGANIK -> 180 derajat
const int PILAH_KERTAS_TISU = 0;   // Posisi 1: KERTAS atau TISU
const int PILAH_ANORGANIK = 180;   // Posisi 2: ANORGANIK LAIN
const int PILAH_NETRAL = 90;

MFRC522 rfid(SS_PIN, RST_PIN); 
Servo servoUtama;
Servo servoPemilah;

unsigned long lastUltrasonicUpdate = 0;

// Forward declarations
int bacaUltrasonic();
void updateBinStatus(int distance_cm, String status);
void handleCard(String cardID, int distance_cm);
bool kirimKeBackend(String uid, DynamicJsonDocument& responseDoc, int distance_cm);
void operateServo(const String& command);

void setup() {
  Serial.begin(115200);
  
  // Setup Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Setup Servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  servoUtama.setPeriodHertz(50);
  servoUtama.attach(SERVO1_PIN, 500, 2400);
  servoUtama.write(TUTUP_UTAMA);

  servoPemilah.setPeriodHertz(50);
  servoPemilah.attach(SERVO2_PIN, 500, 2400);
  servoPemilah.write(PILAH_NETRAL);

  // Setup RFID
  SPI.begin(); 
  rfid.PCD_Init();

  // Koneksi WiFi
  Serial.println();
  Serial.print("Menghubungkan ke WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Terhubung!");
  Serial.print("IP Address ESP32: ");
  Serial.println(WiFi.localIP());

  Serial.println("\n--- SYSTEM SIAP: IOT MODE (Updated Logic) ---");
}

// --- FUNGSI BACA JARAK ---
int bacaUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long dur = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout 30ms
  if (dur == 0) return 999; // Anggap kosong jika timeout
  return dur * 0.034 / 2;
}

// --- FUNGSI UPDATE BIN STATUS (Real-time) ---
void updateBinStatus(int distance_cm, String status = "terisi") {
  HTTPClient http;
  
  // Set timeout untuk menghindari hang
  http.setTimeout(3000); // 3 detik timeout untuk bin-update (tidak perlu lama)
  
  if (!http.begin(serverUrl + "/api/bin-update")) {
    Serial.println("⚠️ Bin update: Failed to connect");
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"distance_cm\": " + String(distance_cm) + 
                   ", \"status\": \"" + status + "\"}";
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0 && httpResponseCode < 400) {
    Serial.print("✅ Bin status updated: ");
    Serial.print(distance_cm);
    Serial.print(" cm (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println(")");
  } else {
    // Only log error if it's not a timeout/connection issue
    if (httpResponseCode != -1 && httpResponseCode != -11) {
      Serial.print("⚠️ Bin update error: ");
      Serial.print(httpResponseCode);
      Serial.print(" (distance: ");
      Serial.print(distance_cm);
      Serial.println(" cm)");
    }
    // -1 and -11 are connection errors, don't spam serial
  }
  
  http.end();
}

void loop() {
  // Reconnect WiFi jika putus
  if(WiFi.status() != WL_CONNECTED) {
     WiFi.reconnect();
  }

  // Real-time Update Ultrasonic ke Backend (setiap 2 detik)
  unsigned long currentMillis = millis();
  if (currentMillis - lastUltrasonicUpdate >= ULTRASONIC_UPDATE_INTERVAL) {
    int jarak = bacaUltrasonic();
    if (jarak > 0 && jarak < 999) {
      updateBinStatus(jarak);
    }
    lastUltrasonicUpdate = currentMillis;
  }

  // 1. CEK RFID
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
      uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    
    Serial.println("\n🆔 Kartu Terdeteksi: " + uid);

    // 2. CEK KAPASITAS DULU (Logika Baru)
    int jarak = bacaUltrasonic();
    Serial.print("📊 Jarak Sampah: ");
    Serial.print(jarak);
    Serial.println(" cm");

    // Jika jarak sangat dekat (<= 5cm), berarti Penuh
    if (jarak > 0 && jarak <= BATAS_PENUH) {
      Serial.println("⚠ STATUS: PENUH! Akses Ditolak.");
      // Kirim status PENUH ke backend
      updateBinStatus(jarak, "PENUH");
      // Tidak melakukan apa-apa (Pintu tetap tutup)
    } 
    else {
      // Masih Kosong -> Lanjut Proses
      Serial.println("✅ Status: Aman. Memproses...");
      updateBinStatus(jarak, "AMAN");
      handleCard(uid, jarak);
    }

    // Stop baca kartu ini
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}

// --- LOGIKA UTAMA ---
void handleCard(String cardID, int distance_cm) {
  Serial.println("📡 Meminta backend mengidentifikasi role / sampah...");
  DynamicJsonDocument responseDoc(768);
  if (!kirimKeBackend(cardID, responseDoc, distance_cm)) {
    Serial.println("❌ Backend tidak responsif, coba ulang.");
    return;
  }

  const String status = responseDoc["status"] | "";
  if (status == "role_login") {
    const String role = responseDoc["role"] | "unknown";
    Serial.printf("👤 Role detected: %s\n", role.c_str());
    
    // LOGIKA KHUSUS UNTUK PETUGAS: Servo 1 buka 1 menit, Servo 2 bergerak otomatis
    if (role == "petugas") {
      Serial.println("🔧 Mode Petugas: Membuka pintu untuk pembersihan...");
      operateServoPetugas();
      return;
    }
    
    // Admin atau role lain: tidak melakukan aksi servo
    Serial.println("ℹ️ Tidak melakukan aksi servo untuk role ini.");
    return;
  }

  if (status == "unregistered") {
    Serial.println("🆕 RFID belum terdaftar. Kirim ke UI untuk registrasi.");
    return;
  }

  if (status != "success") {
    Serial.printf("⚠️ Backend mengembalikan status %s\n", status.c_str());
    return;
  }

  const String command = responseDoc["esp_command"] | "UNKNOWN";
  operateServo(command);
}

void moveServoSlow(Servo& servo, int target, int delayMs) {
  int current = servo.read();
  if (current == target) return;
  
  // Direct move for faster response (only use slow for fine control if needed)
  if (abs(target - current) > 10) {
    // Large movement: move directly
    servo.write(target);
    delay(50); // Small delay for servo to reach position
  } else {
    // Small movement: use step-by-step
    int step = target > current ? 1 : -1;
    while (current != target) {
      current += step;
      servo.write(current);
      delay(delayMs);
    }
  }
}

// --- FUNGSI KHUSUS UNTUK PETUGAS ---
void operateServoPetugas() {
  Serial.println("🔧 ========== MODE PETUGAS ==========");
  Serial.println("🔄 Membuka Pintu Utama (Servo 1) selama 1 menit...");
  servoUtama.write(BUKA_UTAMA);
  delay(500); // Wait for servo to reach position
  Serial.println("✅ Pintu Utama Terbuka");
  
  // Servo 1 tetap terbuka selama 1 menit (60 detik)
  // Sambil itu, Servo 2 bergerak otomatis:
  // - 30 detik pertama: ke KERTAS/TISU (0 derajat)
  // - 30 detik kedua: ke ANORGANIK (180 derajat)
  
  unsigned long startTime = millis();
  const unsigned long TOTAL_TIME = 60000; // 1 menit = 60000 ms
  const unsigned long HALF_TIME = 30000;  // 30 detik = 30000 ms
  
  Serial.println("🔄 Fase 1: Servo Pemilah ke KERTAS/TISU (30 detik)...");
  servoPemilah.write(PILAH_KERTAS_TISU);
  delay(500);
  Serial.println("✅ Servo Pemilah di posisi KERTAS/TISU (0 derajat)");
  
  // Tunggu 30 detik pertama (sambil Servo 1 tetap terbuka)
  unsigned long elapsed = 0;
  while (elapsed < HALF_TIME) {
    delay(1000); // Check setiap 1 detik
    elapsed = millis() - startTime;
    if (elapsed < HALF_TIME) {
      Serial.print("⏳ Waktu tersisa Fase 1: ");
      Serial.print((HALF_TIME - elapsed) / 1000);
      Serial.println(" detik");
    }
  }
  
  Serial.println("🔄 Fase 2: Servo Pemilah ke ANORGANIK (30 detik)...");
  servoPemilah.write(PILAH_ANORGANIK);
  delay(500);
  Serial.println("✅ Servo Pemilah di posisi ANORGANIK (180 derajat)");
  
  // Tunggu 30 detik kedua (sambil Servo 1 tetap terbuka)
  while (elapsed < TOTAL_TIME) {
    delay(1000); // Check setiap 1 detik
    elapsed = millis() - startTime;
    if (elapsed < TOTAL_TIME) {
      Serial.print("⏳ Waktu tersisa Fase 2: ");
      Serial.print((TOTAL_TIME - elapsed) / 1000);
      Serial.println(" detik");
    }
  }
  
  Serial.println("🔄 Reset Posisi...");
  Serial.println("  - Reset Servo Pemilah ke netral...");
  servoPemilah.write(PILAH_NETRAL);
  delay(500);
  Serial.println("  - Menutup Pintu Utama...");
  servoUtama.write(TUTUP_UTAMA);
  delay(500);
  Serial.println("✅ Selesai - Mode Petugas selesai, semua servo kembali ke posisi awal.");
  Serial.println("=====================================");
}

void operateServo(const String& command) {
  Serial.println("🔄 Membuka Pintu Utama (Servo 1)...");
  servoUtama.write(BUKA_UTAMA);
  delay(500); // Wait for servo to reach position
  Serial.println("✅ Pintu Utama Terbuka");
  delay(3000); // Tunggu 3 detik sesuai spesifikasi

  Serial.print("🧠 Command pemilah diterima: ");
  Serial.println(command);
  
  // Mapping command ke posisi servo
  // Posisi 1: KERTAS/TISU -> 0 derajat
  // Posisi 2: ANORGANIK -> 180 derajat
  int target = PILAH_NETRAL;
  if (command == "KERTAS" || command == "TISU") {
    target = PILAH_KERTAS_TISU; // Posisi 1: 0 derajat
    Serial.print("📍 Servo Pemilah (Servo 2) akan bergerak ke Posisi 1 - ");
    Serial.print(command);
    Serial.print(" (");
    Serial.print(target);
    Serial.println(" derajat)");
  } else if (command == "ANORGANIK") {
    target = PILAH_ANORGANIK; // Posisi 2: 180 derajat
    Serial.print("📍 Servo Pemilah (Servo 2) akan bergerak ke Posisi 2 - ANORGANIK (");
    Serial.print(target);
    Serial.println(" derajat)");
  } else {
    Serial.print("⚠️ Command tidak dikenal: '");
    Serial.print(command);
    Serial.println("', menggunakan posisi netral");
  }
  
  // Move Servo 2 (Pemilah) - FIXED: Now it will move!
  Serial.println("🔄 Menggerakkan Servo Pemilah (Servo 2)...");
  servoPemilah.write(target);
  delay(500); // Wait for servo to reach position
  Serial.print("✅ Servo Pemilah di posisi: ");
  Serial.println(target);
  delay(2000); // Wait for sorting

  Serial.println("🔄 Reset Posisi...");
  Serial.println("  - Reset Servo Pemilah ke netral...");
  servoPemilah.write(PILAH_NETRAL);
  delay(500);
  Serial.println("  - Menutup Pintu Utama...");
  servoUtama.write(TUTUP_UTAMA);
  delay(500);
  Serial.println("✅ Selesai - Semua servo kembali ke posisi awal.");
}

// --- FUNGSI KOMUNIKASI HTTP ---
bool kirimKeBackend(String uid, DynamicJsonDocument& responseDoc, int distance_cm) {
  const int max_attempts = 3;
  bool success = false;
  HTTPClient http;

  for (int attempt = 1; attempt <= max_attempts && !success; attempt++) {
    http.begin(serverUrl + "/api/scan-rfid");
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(30000); // 30 detik timeout untuk scan-rfid (kamera + TensorFlow processing, tanpa Gemini)
    String payload = "{\"card_id\": \"" + uid + "\"";
    if (distance_cm > 0) {
      payload += ", \"distance_cm\": ";
      payload += String(distance_cm);
    }
    payload += "}";

    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      String response = http.getString();
      DeserializationError error = deserializeJson(responseDoc, response);
      if (!error) {
        success = true;
      } else {
        Serial.println("❌ Error parse JSON backend.");
      }
    } else if (httpResponseCode == 404) {
      Serial.println("⚠️ RFID belum terdaftar.");
      String response = http.getString();
      DeserializationError error = deserializeJson(responseDoc, response);
      if (!error) {
        success = true;
      }
    } else {
      Serial.print("⚠️ HTTP POST error: ");
      Serial.println(httpResponseCode);
    }

    http.end();

    if (!success && attempt < max_attempts) {
      delay(750);
    }
  }

  return success;
}


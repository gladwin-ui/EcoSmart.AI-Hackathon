/*
  PROJECT: EcoSmart.AI - IoT Final (Fixed Wiring)
  BOARD: ESP32 Dev Module
  
  WIRING FIX:
  - Servo 1 (Pintu Utama)   -> GPIO 13
  - Servo 2 (Pintu Pemilah) -> GPIO 25
  - Trig Ultra              -> GPIO 27
  - Echo Ultra              -> GPIO 26
  - RFID SDA (21), SCK (18), MOSI (23), MISO (19), RST (22)
  
  ALUR LOGIKA:
  1. Standby.
  2. Tap RFID -> Cek Kapasitas Ultrasonic (Dalam).
     - Jika Jarak <= 5cm (Penuh) -> Stop, Alert.
     - Jika Aman -> Lanjut.
  3. Buka Servo 1 (Utama).
  4. Kirim UID ke Backend Flask.
  5. Backend jepret kamera -> Analisis AI -> Balas "TISU" atau "KERTAS".
  6. Terima Balasan -> Gerakkan Servo 2 (Pemilah).
     - TISU -> 0 derajat.
     - KERTAS -> 180 derajat.
  7. Reset semua Servo ke posisi awal.
*/

#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // WAJIB INSTALL: ArduinoJson by Benoit Blanchon

// --- 1. KONFIGURASI WIFI & SERVER ---
const char* ssid     = "wiinn";      // GANTI DENGAN WIFI HP/LAPTOP
const char* password = "malesahh";  // GANTI PASSNYA
// Ganti IP 192.168.0.105 dengan IP Laptop Anda yang didapat dari terminal
const String serverUrl = "http://10.81.7.144:5001/api/scan-rfid"; 

// --- 2. KONFIGURASI PIN ---
#define SS_PIN      21
#define RST_PIN     22

// Perbaikan Pin Sesuai Request User
#define SERVO1_PIN  13  // Pintu Utama
#define SERVO2_PIN  25  // Pintu Pemilah
#define TRIG_PIN    27  // Trig Ultrasonic
#define ECHO_PIN    26  // Echo Ultrasonic

// --- 3. VARIABEL & KONSTANTA ---
const int BATAS_PENUH = 5; // cm
const int SERVO_PRIMARY_DELAY = 20;
const int SERVO_SECONDARY_DELAY = 12;

// Setting Posisi Servo
const int TUTUP_UTAMA  = 0;
const int BUKA_UTAMA   = 90;

const int PILAH_TISU   = 0;    // Gerak ke Kanan (misal 0 derajat)
const int PILAH_KERTAS = 180;  // Gerak ke Kiri (misal 180 derajat)
const int PILAH_NETRAL = 90;   // Tengah

MFRC522 rfid(SS_PIN, RST_PIN); 
Servo servoUtama;
Servo servoPemilah;

void setup() {
  Serial.begin(115200);
  
  // Setup Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Setup Servos
  // Alokasi timer agar tidak crash
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  servoUtama.setPeriodHertz(50);
  servoUtama.attach(SERVO1_PIN, 500, 2400);
  servoUtama.write(TUTUP_UTAMA); // Posisi Awal Tutup

  servoPemilah.setPeriodHertz(50);
  servoPemilah.attach(SERVO2_PIN, 500, 2400);
  servoPemilah.write(PILAH_NETRAL); // Posisi Awal Tengah

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

  Serial.println("\n--- SYSTEM SIAP: IOT MODE (FIXED WIRING) ---");
}

void loop() {
  // Reconnect WiFi jika putus
  if(WiFi.status() != WL_CONNECTED) {
     WiFi.reconnect();
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
    // Kita filter jarak > 0 agar tidak error bacaan 0
    if (jarak > 0 && jarak <= BATAS_PENUH) {
      Serial.println("⚠ STATUS: PENUH! Akses Ditolak.");
      // Tidak melakukan apa-apa (Pintu tetap tutup)
    } 
    else {
      // Masih Kosong -> Lanjut Proses
      Serial.println("✅ Status: Aman. Memproses...");
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
    Serial.printf("👤 Role detected: %s. Tidak melakukan aksi servo.\n", role.c_str());
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
  int step = target > current ? 1 : -1;
  while (current != target) {
    current += step;
    servo.write(current);
    delay(delayMs);
  }
}

void operateServo(const String& command) {
  Serial.println("🔄 Membuka Pintu Utama...");
  moveServoSlow(servoUtama, BUKA_UTAMA, SERVO_PRIMARY_DELAY);
  delay(2000);

  Serial.print("🧠 Command pemilah: ");
  Serial.println(command);
  int target = command == "KERTAS" ? PILAH_TISU : PILAH_KERTAS;
  moveServoSlow(servoPemilah, target, SERVO_SECONDARY_DELAY);

  delay(2000);

  Serial.println("🔄 Reset Posisi...");
  moveServoSlow(servoPemilah, PILAH_NETRAL, SERVO_SECONDARY_DELAY);
  delay(600);
  moveServoSlow(servoUtama, TUTUP_UTAMA, SERVO_PRIMARY_DELAY);
  delay(800);
  Serial.println("✅ Selesai.");
}

// --- FUNGSI KOMUNIKASI HTTP ---
bool kirimKeBackend(String uid, DynamicJsonDocument& responseDoc, int distance_cm) {
  const int max_attempts = 3;
  bool success = false;
  HTTPClient http;

  for (int attempt = 1; attempt <= max_attempts && !success; attempt++) {
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
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
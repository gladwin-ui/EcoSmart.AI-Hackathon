import cv2
import numpy as np
import tensorflow as tf
import time

# ==========================================
# 1. KONFIGURASI PENGGUNA
# ==========================================
# Ganti dengan nama file model hasil training terakhir Anda
MODEL_PATH = 'model_sampah_csv_custom.h5' 

# Ukuran input model (Wajib 224 jika pakai MobileNetV2 standar)
IMG_SIZE = (224, 224)

# Label Kelas (Sesuai urutan alfabetis folder/generator)
# 0 = Anorganik, 1 = Kertas/Tisu
LABELS = ['ANORGANIK / LAINNYA', 'KERTAS / TISU']

# SENSITIVITAS (Threshold)
# Jika nilai prediksi > 0.70 (70%), baru dianggap Kertas.
# Jika di bawah itu, dianggap Anorganik (biar aman).
CONFIDENCE_THRESHOLD = 0.70

# ==========================================
# 2. LOAD MODEL
# ==========================================
print(f"[INFO] Sedang memuat model: {MODEL_PATH}...")
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("[INFO] Model berhasil dimuat!")
except:
    print(f"[ERROR] File '{MODEL_PATH}' tidak ditemukan!")
    print("Pastikan nama file model di kode sama dengan file asli Anda.")
    exit()

# ==========================================
# 3. FUNGSI UTAMA
# ==========================================
def preprocess_image(frame):
    # 1. Resize ke 224x224
    img = cv2.resize(frame, IMG_SIZE)
    # 2. Convert ke Array & Normalisasi (0-1)
    img = np.array(img, dtype=np.float32) / 255.0
    # 3. Tambah dimensi batch [1, 224, 224, 3]
    img = np.expand_dims(img, axis=0)
    return img

def draw_bar(frame, score):
    """Menggambar bar visualisasi kepercayaan"""
    h, w, _ = frame.shape
    
    # Background Bar (Abu-abu)
    bar_x, bar_y = 50, h - 50
    bar_w, bar_h = w - 100, 20
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (50, 50, 50), -1)
    
    # Penunjuk Nilai (Bulatan bergerak kiri-kanan)
    # Score 0.0 (Kiri/Anorganik) -- Score 1.0 (Kanan/Kertas)
    indicator_x = int(bar_x + (score * bar_w))
    
    # Warna indikator berubah (Merah -> Kuning -> Hijau)
    color = (0, 0, 255) # Merah default
    if score > 0.5: color = (0, 255, 255) # Kuning
    if score > CONFIDENCE_THRESHOLD: color = (0, 255, 0) # Hijau
        
    cv2.circle(frame, (indicator_x, bar_y + 10), 15, color, -1)
    
    # Label Kiri Kanan
    cv2.putText(frame, "Anorganik (0)", (bar_x, bar_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    cv2.putText(frame, "Kertas (1)", (bar_x + bar_w - 70, bar_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

# ==========================================
# 4. JALANKAN WEBCAM
# ==========================================
cap = cv2.VideoCapture(0) # Ganti 0 dengan 1 jika pakai webcam eksternal

if not cap.isOpened():
    print("[ERROR] Webcam tidak terdeteksi.")
    exit()

print("[INFO] Mulai... Tekan 'Q' untuk keluar.")
prev_time = 0

while True:
    ret, frame = cap.read()
    if not ret: break

    # Flip frame biar seperti cermin
    frame = cv2.flip(frame, 1)
    
    # -- PREDIKSI --
    input_data = preprocess_image(frame)
    prediction = model.predict(input_data, verbose=0)
    score = float(prediction[0][0]) # Nilai 0.0 s/d 1.0

    # -- LOGIKA KEPUTUSAN --
    # Default: Anorganik (Merah)
    label = LABELS[0]
    color = (0, 0, 255) # Merah (BGR)
    display_conf = 1.0 - score # Persentase keyakinan anorganik
    
    # Jika score sangat tinggi melewati batas ambang kertas
    if score > CONFIDENCE_THRESHOLD:
        label = LABELS[1] # Kertas
        color = (0, 255, 0) # Hijau
        display_conf = score

    # -- VISUALISASI --
    # 1. Kotak di sekeliling layar (Border indikator)
    cv2.rectangle(frame, (0, 0), (frame.shape[1], frame.shape[0]), color, 10)
    
    # 2. Teks Label Besar
    text = f"{label} ({display_conf*100:.1f}%)"
    cv2.putText(frame, text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 4) # Outline hitam
    cv2.putText(frame, text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2) # Teks warna

    # 3. Bar Meteran
    draw_bar(frame, score)
    
    # 4. FPS Counter
    curr_time = time.time()
    fps = 1 / (curr_time - prev_time)
    prev_time = curr_time
    cv2.putText(frame, f"FPS: {int(fps)}", (frame.shape[1] - 100, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    # Tampilkan
    cv2.imshow("Uji Model Sampah Pintar", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
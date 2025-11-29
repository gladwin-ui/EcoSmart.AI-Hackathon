import cv2
import numpy as np
import tensorflow as tf
import os

# --- KONFIGURASI ---
# Ganti nama file ini sesuai dengan nama model yang Anda download dari Colab
MODEL_PATH = 'model_mobilenet_final_finetuned.h5'

# Ukuran input yang diharapkan oleh model (harus sama saat training!)
IMG_SIZE = (224, 224)

# Label kelas (sesuaikan urutan alfabetis folder training Anda di Drive dulu)
# Biasanya: 0 = Anorganik Lain, 1 = Kertas/Tisu (jika pakai sigmoid)
CLASSES = ['Anorganik Lain', 'Kertas/Tisu']

# Ambang batas kepercayaan (threshold)
THRESHOLD = 0.5

# --- 1. LOAD MODEL ---
print("Sedang memuat model... Mohon tunggu.")
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model berhasil dimuat!")
except OSError:
    print(f"\n[ERROR] File model '{MODEL_PATH}' tidak ditemukan!")
    print("Pastikan file .h5 berada di folder yang sama dengan script ini.")
    exit()

# --- FUNGSI PREPROCESSING ---
def preprocess_frame(frame):
    """
    Mengubah frame webcam menjadi format yang dimengerti model.
    1. Resize ke 224x224
    2. Convert ke float32
    3. Normalisasi (0-255 jadi 0.0-1.0)
    4. Tambah dimensi batch (jadi [1, 224, 224, 3])
    """
    # Resize gambar ke ukuran target model
    resized_img = cv2.resize(frame, IMG_SIZE)
    
    # Ubah jadi array numpy float32
    img_array = np.array(resized_img, dtype=np.float32)
    
    # Normalisasi (SANGAT PENTING: harus sama dengan saat training rescale=1./255)
    normalized_img = img_array / 255.0
    
    # Tambahkan dimensi batch di depan
    # Model mengharapkan input bentuk (Batch_Size, Height, Width, Channels)
    input_data = np.expand_dims(normalized_img, axis=0)
    
    return input_data

# --- 2. SETUP WEBCAM ---
# Angka 0 biasanya adalah webcam bawaan laptop. Ganti ke 1 jika pakai webcam eksternal.
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("[ERROR] Tidak bisa membuka webcam.")
    exit()

print("\nMulai mendeteksi... Tekan 'q' di keyboard untuk keluar.")

# --- 3. LOOP UTAMA (REAL-TIME) ---
while True:
    # Baca frame dari webcam
    ret, frame = cap.read()
    if not ret:
        print("Gagal menerima frame (stream end?). Exiting ...")
        break

    # --- A. Preprocessing & Prediksi ---
    input_data = preprocess_frame(frame)
    
    # Jalankan inferensi (prediksi)
    # Hasilnya adalah array 2D, misal [[0.85]]
    prediction = model.predict(input_data, verbose=0)
    score = prediction[0][0] # Ambil nilai floatnya saja

    # --- B. Logika Penentuan Kelas ---
    # Karena pakai aktivasi 'sigmoid', outputnya adalah probabilitas antara 0.0 s/d 1.0
    # Kita asumsikan mendekati 1 adalah Kertas (kelas positif), mendekati 0 adalah Lainnya.
    label = ""
    confidence = 0.0
    color = (0, 0, 0) # Format BGR (Blue, Green, Red)

    if score > THRESHOLD:
        label = CLASSES[1] # Kertas/Tisu
        confidence = score
        color = (0, 255, 0) # Hijau
    else:
        label = CLASSES[0] # Anorganik Lain
        confidence = 1.0 - score # Balik nilai kepercayaannya
        color = (0, 0, 255) # Merah

    # --- C. Visualisasi di Layar ---
    # Buat teks label dan persentase
    text = f"{label}: {confidence*100:.1f}%"
    
    # Gambar kotak background untuk teks agar terbaca jelas
    cv2.rectangle(frame, (10, 10), (300, 50), color, -1) # -1 artinya kotak terisi penuh
    
    # Tulis teks di atas kotak tadi (warna teks putih/hitam)
    text_color = (255, 255, 255) if score > THRESHOLD else (255, 255, 255)
    cv2.putText(frame, text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, text_color, 2)

    # Tampilkan hasil frame di jendela
    cv2.imshow('Sistem Pemilah Sampah Pintar (Tekan Q untuk keluar)', frame)

    # --- D. Tombol Keluar ---
    # Tunggu 1ms, jika tombol 'q' ditekan, break loop
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# --- CLEANUP ---
# Lepaskan kamera dan tutup jendela
cap.release()
cv2.destroyAllWindows()
print("Program selesai.")
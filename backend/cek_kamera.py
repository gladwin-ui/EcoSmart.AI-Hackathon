import cv2
import time

def test_camera_indices():
    print("🔍 MEMULAI DIAGNOSA KAMERA...")
    print("-----------------------------")

    # Cek Index 0 sampai 4
    for index in range(5):
        print(f"\n👉 Mencoba Kamera Index {index}...")
        cap = cv2.VideoCapture(index)
        
        if not cap.isOpened():
            print(f"   ❌ Index {index}: Gagal dibuka (Tidak terdeteksi/Izin ditolak)")
        else:
            # Coba baca frame
            ret, frame = cap.read()
            if ret:
                print(f"   ✅ Index {index}: BERHASIL! (Resolusi: {frame.shape[1]}x{frame.shape[0]})")
                
                # Simpan bukti foto
                filename = f"test_cam_{index}.jpg"
                cv2.imwrite(filename, frame)
                print(f"      Bukti foto tersimpan: {filename}")
            else:
                print(f"   ⚠️ Index {index}: Terbuka, tapi frame kosong (Blank Screen)")
            
            cap.release()
    
    print("\n-----------------------------")
    print("DIAGNOSA SELESAI.")

if __name__ == "__main__":
    test_camera_indices()
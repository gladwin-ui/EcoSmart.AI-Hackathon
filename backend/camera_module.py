import cv2
import time
import os
import platform
from typing import Optional, Tuple

# Lokasi penyimpanan gambar sementara
CAPTURE_FOLDER = "static/captures"
# OBS Virtual Cam biasanya di index 0
PREFERRED_INDICES = (1, 0)
TARGET_RESOLUTION = (1280, 720)
WARM_UP_FRAMES = 5  # Kurangi untuk mempercepat (OBS Virtual Cam cepat)
WARM_UP_SLEEP_SECONDS = 0.5  # Kurangi dari 2 detik ke 0.5 detik

IS_WINDOWS = platform.system().lower() == "windows"
WINDOWS_BACKENDS = (cv2.CAP_DSHOW, cv2.CAP_MSMF)
UNIX_BACKENDS = (cv2.CAP_AVFOUNDATION, cv2.CAP_V4L2)
CAMERA_BACKENDS = WINDOWS_BACKENDS if IS_WINDOWS else UNIX_BACKENDS


def _ensure_capture_folder() -> None:
    os.makedirs(CAPTURE_FOLDER, exist_ok=True)


def _backend_name(backend: int) -> str:
    if backend == cv2.CAP_DSHOW:
        return "CAP_DSHOW"
    if backend == cv2.CAP_MSMF:
        return "CAP_MSMF"
    if backend == cv2.CAP_AVFOUNDATION:
        return "CAP_AVFOUNDATION"
    if backend == cv2.CAP_V4L2:
        return "CAP_V4L2"
    return "UNKNOWN_BACKEND"


def _open_camera() -> Tuple[Optional[cv2.VideoCapture], Optional[int]]:
    for backend in CAMERA_BACKENDS:
        for index in PREFERRED_INDICES:

            backend_label = _backend_name(backend)
            print(f"📸 [CAMERA] Mencoba membuka kamera index {index} "
                  f"dengan backend {backend_label}...")

            cap = cv2.VideoCapture(index, backend)

            if not cap.isOpened():
                cap.release()
                print(f"⚠️ [CAMERA] Kamera index {index} gagal dibuka ({backend_label}).")
                continue

            # Set resolusi
            width, height = TARGET_RESOLUTION
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)

            print(f"✅ [CAMERA] Kamera index {index} aktif dengan backend "
                  f"{backend_label} dan resolusi {width}x{height}.")
            return cap, index

    print("❌ [CAMERA] Gagal membuka semua kamera yang tersedia.")
    return None, None


def _warm_up_camera(cap: cv2.VideoCapture) -> None:
    # Reduce warm-up untuk mempercepat response (OBS Virtual Cam biasanya cepat)
    time.sleep(0.5)  # Kurangi dari 2 detik ke 0.5 detik
    for frame_number in range(5):  # Kurangi dari 15 frame ke 5 frame
        ret, _ = cap.read()
        if not ret:
            print(f"⚠️ [CAMERA] Frame pemanasan {frame_number + 1} tidak valid.")
        if frame_number >= 2 and ret:  # Jika sudah dapat 2 frame valid, cukup
            break


def take_picture() -> Optional[str]:
    """
    Membuka webcam, mengambil 1 frame, menyimpannya, lalu menutup webcam.
    Return: Path file gambar (String) atau None jika gagal.
    """
    _ensure_capture_folder()
    filename = f"{CAPTURE_FOLDER}/scan_latest.jpg"

    cap, index = _open_camera()
    if cap is None:
        return None

    try:
        _warm_up_camera(cap)
        ret, frame = cap.read()

        if not ret or frame is None or frame.size == 0:
            print("❌ [CAMERA] Gagal menangkap frame yang valid setelah pemanasan.")
            return None

        cv2.imwrite(filename, frame)
        print(f"✅ [CAMERA] Gambar tersimpan di: {filename}")
        return filename

    except Exception as exc:
        print(f"❌ [CAMERA] Terjadi error saat pengambilan gambar: {exc}")
        return None

    finally:
        cap.release()
        cv2.destroyAllWindows()


# Untuk tes manual
if __name__ == "__main__":
    take_picture()

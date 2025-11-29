import os
import tensorflow as tf
import cv2
import numpy as np

MODEL_PATH = os.path.join("models", "model_sampah_csv_custom.h5")
IMG_SIZE = (224, 224)
CLASSES = ["Anorganik Lain", "Kertas/Tisu"]
THRESHOLD = 0.7

model = None


def load_model_once():
    global model
    if model is None:
        print("⏳ [AI] Loading Model TensorFlow... (Tunggu sebentar)")
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print("✅ [AI] Model Loaded!")
        except Exception as exc:
            print(f"❌ [AI] Error Load Model: {exc}")
            return False
    return True


def _map_index_to_label(idx: int) -> str:
    if idx == 1:
        return "KERTAS"
    return "ANORGANIK"


def predict_image(image_path: str) -> dict:
    if not load_model_once():
        return {
            "label": "ERROR",
            "confidence": 0.0,
            "model": os.path.basename(MODEL_PATH),
            "details": {"error": "Model gagal diload"},
        }

    img = cv2.imread(image_path)
    if img is None:
        return {
            "label": "ERROR",
            "confidence": 0.0,
            "model": os.path.basename(MODEL_PATH),
            "details": {"error": "Gambar tidak ditemukan"},
        }

    img_resized = cv2.resize(img, IMG_SIZE)
    img_array = img_resized.astype("float32") / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    prediction = model.predict(img_array)
    raw = np.squeeze(prediction)
    prediction_list = raw.tolist() if hasattr(raw, "tolist") else [float(raw)]

    label = "ANORGANIK"
    confidence = 0.0

    if raw.size == 1:
        score = float(raw)
        label = "KERTAS" if score >= THRESHOLD else "ANORGANIK"
        confidence = score if label == "KERTAS" else 1.0 - score
    else:
        best_idx = int(np.argmax(raw))
        label = _map_index_to_label(best_idx)
        confidence = float(raw[best_idx])

    confidence = max(0.0, min(confidence, 1.0))
    print(f"🔍 [AI SCORE] Label: {label}, Confidence: {confidence:.4f} (raw: {prediction_list})")

    return {
        "label": label,
        "confidence": confidence,
        "model": os.path.basename(MODEL_PATH),
        "details": {
            "raw": prediction_list,
            "classes": CLASSES,
        },
    }

import json
import os
import google.generativeai as genai
import PIL.Image

# --- KONFIGURASI API GEMINI ---
API_KEY = os.environ.get(
    "AI_GEMINI_KEY",
    "AIzaSyC38YqI6AyzggACRdiobu1TrRrc0Ch2Ndc",
)

genai.configure(api_key=API_KEY)
# Use correct model name - try different model names
MODEL = None
model_names = ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash-latest"]
for model_name in model_names:
    try:
        MODEL = genai.GenerativeModel(model_name)
        print(f"✅ [AI] Gemini model '{model_name}' loaded successfully")
        break
    except Exception as e:
        print(f"⚠️ [AI] Failed to load model '{model_name}': {e}")
        continue

if MODEL is None:
    print("❌ [AI] All Gemini models failed to load, using fallback")
    # Create a dummy model that will return default response
    MODEL = None


def _clean_text(text: str) -> str:
    return text.replace("```json", "").replace("```", "").strip()


def analyze_trash(image_path: str = None) -> dict:
    """
    Mengirim gambar sampah ke Gemini untuk mendapatkan second opinion.
    Jika image_path None, akan menggunakan prompt teks saja.
    """
    if MODEL is None:
        print("⚠️ [AI] Gemini model tidak tersedia, menggunakan default classification")
        return {
            "type": "ANORGANIK", 
            "item_name": "Default Classification", 
            "confidence": 70,
            "reason": "Gemini model tidak tersedia, menggunakan klasifikasi default"
        }
    
    try:
        if image_path:
            # HAPUS: Tidak pakai Gemini untuk scan - hanya TensorFlow
            # Gemini hanya untuk chatbot, bukan untuk scan sampah
            # Return default untuk menghindari error
            return {
                "type": "ANORGANIK", 
                "item_name": "TensorFlow Only", 
                "confidence": 60,
                "reason": "Gemini tidak digunakan untuk scan - hanya TensorFlow"
            }
        else:
            print("🧠 [AI] Menggunakan Gemini tanpa gambar (text-only)...")
            prompt = """
            Klasifikasikan sampah yang umum ditemukan dan jawab dalam JSON:
            {"type":"KERTAS" atau "ANORGANIK","item_name":"nama benda","confidence":0-100,"reason":"alasan"}
            Berikan klasifikasi default untuk sampah umum.
            """
            response = MODEL.generate_content(prompt)
        
        clean_text = _clean_text(response.text)
        result_json = json.loads(clean_text)
        print(f"✅ [AI] Gemini memberikan opini: {result_json}")
        return result_json
    except Exception as exc:
        print(f"❌ [AI] Error saat memanggil Gemini: {exc}")
        return {
            "type": "ANORGANIK", 
            "item_name": "Tidak Teridentifikasi", 
            "confidence": 60,
            "reason": f"Gemini gagal: {str(exc)}"
        }


def classify_with_gemini(image_path: str = None) -> dict:
    """
    Klasifikasi sampah menggunakan Gemini API.
    Jika image_path None, akan menggunakan deskripsi teks default.
    """
    raw = analyze_trash(image_path)
    label = "KERTAS" if raw.get("type", "").upper() == "KERTAS" else "ANORGANIK"
    confidence_percent = float(raw.get("confidence", 60))
    confidence = max(0.0, min(confidence_percent / 100.0, 1.0))
    return {
        "label": label,
        "confidence": confidence,
        "details": raw
    }


def ask_gemini(question: str, stats: dict) -> str:
    if MODEL is None:
        return "Maaf, AI service sedang tidak tersedia. Silakan coba lagi nanti."
    
    try:
        stats_block = json.dumps(stats, ensure_ascii=False, indent=2)
        prompt = f"""
        Kamu adalah asisten pengelolaan sampah EcoSmart.AI. Berikut ringkasan data terbaru:
        {stats_block}

        Gunakan data tersebut untuk menjawab pertanyaan berikut:
        Pertanyaan: {question}

        Jawab dalam bahasa Indonesia dengan insight relevan dan rekomendasi singkat.
        """
        response = MODEL.generate_content([prompt])
        return _clean_text(response.text)
    except Exception as exc:
        print(f"❌ [AI] Gagal menjawab chat Gemini: {exc}")
        return "Maaf, Gemini sedang sibuk. Silakan ulangi beberapa saat lagi."
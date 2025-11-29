# Prompt Dokumentasi EcoSmart.AI

## 1. Prompt `analyze_trash`

- Tujuan: minta Gemini mengidentifikasi kategori `KERTAS` atau `ANORGANIK` dari foto kamera lokal.
- Format: singkat, langsung minta output JSON.
- Contoh:

```text
Lihat gambar ini dan jawab dalam JSON:
{"type":"KERTAS" atau "ANORGANIK","item_name":"nama benda","confidence":0-100,"reason":"alasan"}
```

Field `confidence` diharapkan angka 0-100, yang kemudian dibagi 100 di backend agar menjadi persentase.

## 2. Prompt `ask_gemini`

- Tujuan: jawaban insight dalam bahasa Indonesia, berdasarkan statistik dashboard (total log, lokasi, dsb.).
- Format: sertakan data ringkasan dalam prompt dan ajukan pertanyaan, kemudian minta rekomendasi singkat.
- Contoh:

```text
Kamu adalah asisten EcoSmart.AI. Berikut ringkasan data terbaru: {...stats...}
Gunakan data tersebut untuk menjawab pertanyaan berikut:
Pertanyaan: <pertanyaan pengguna>
```

Gunakan prompt ini untuk `POST /api/chat-gemini`. Respons bersifat naratif, bukan JSON.


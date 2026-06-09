
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const FAMILY_TO_LOCAL = {
  "Carangidae": "Bawal Hitam / Layang / Selar",
  "Cephalopoda": "Cumi-cumi",
  "Clupeidae": "Lemuru / Tembang",
  "Dactylopteridae": "Sapu-Sapu Laut",
  "Engraulidae": "Teri",
  "Gastropoda": "Keong Laut",
  "Lutjanidae": "Kakap Merah",
  "Macrouridae": "Ekor Tikus",
  "Mugilidae": "Belanak",
  "Mullidae": "Kuniran",
  "Myliobatiformes": "Pari",
  "Nemipteridae": "Kurisi",
  "Penaeidae": "Udang Api",
  "Polynemidae": "Koro",
  "Portunidae": "Rajungan",
  "Priacanthidae": "Swanggi",
  "Scombridae": "Cakalang / Kembung / Tengiri / Tongkol / Tuna",
  "Scorpaenidae": "Lepu",
  "Selachimorpha": "Cucut",
  "Serranidae": "Kerapu",
  "Siganidae": "Baronang",
  "Stromateidae": "Bawal Putih",
  "Trichiuridae": "Layur"
};

class AIService {
  constructor() {
    this.flaskUrl = process.env.FLASK_API_URL || 'http://127.0.0.1:5001/api/predict';
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';
    // Paksa threshold lebih tinggi (85) jika .env tidak set, karena model lokal belum akurat
    this.threshold = parseFloat(process.env.OPENROUTER_THRESHOLD || 85);
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT || 15000);
  }

  // Helper untuk membaca file aman (Buffer atau Path)
  async getFileBuffer(bufferOrPath) {
    if (typeof bufferOrPath === 'string') {
        return fs.promises.readFile(bufferOrPath);
    }
    return bufferOrPath;
  }

  // 1. Panggil Model Lokal (Flask - PyTorch)
  async localDetection(fileData, filename, mimetype) {
    const formData = new FormData();
    const actualBuffer = await this.getFileBuffer(fileData);
    
    formData.append('image', actualBuffer, { filename, contentType: mimetype });

    const response = await axios.post(this.flaskUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    return response.data;
  }

  // 2. Panggil OpenRouter jika confidence lokal rendah
  async openRouterDetection(fileData, localResult) {
    const actualBuffer = await this.getFileBuffer(fileData);
    const base64Image = actualBuffer.toString('base64');
    
    const topK = localResult.models?.[0]?.predictions?.map(p => p.class_name).join(', ') || 'tidak ada';
    const validClasses = Object.entries(FAMILY_TO_LOCAL).map(([k, v]) => `'${k}' (${v})`).join(', ');

    const prompt = `Anda adalah ahli biologi kelautan profesional. Analisis gambar ikan ini secara teliti.
Model lokal kami memprediksi spesies ini mungkin: ${topK}. (Abaikan jika prediksi ini tampak salah).
Tugas Anda: Pilih SATU famili dari daftar resmi ini: [${validClasses}].
Jawab HANYA dengan format JSON persis seperti ini: {"class": "Nama_Famili_Dari_Daftar", "confidence": 0.95}.
Jika bukan ikan laut atau tidak ada di daftar, jawab: {"class": "unknown", "confidence": 1.0}.
Dilarang menyertakan teks lain selain JSON!`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: this.openRouterModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ]
    }, {
      headers: {
        "Authorization": `Bearer ${this.openRouterKey}`,
        "HTTP-Referer": "https://elogbook.web.id",
        "X-Title": "e-logbook-app",
        "Content-Type": "application/json"
      },
      timeout: this.timeout
    });

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  }

  // LOGIKA UTAMA: Hybrid Threshold
  async detectFish(fileData, filename, mimetype) {
    console.log("🤖 [AI Service] Menjalankan Deteksi Lokal (Flask)...");
    const flaskResponse = await this.localDetection(fileData, filename, mimetype);
    const localData = flaskResponse.data;
    const confidence = parseFloat(localData.best_percentage || 0);

    // Cleanup temp file (jika menggunakan diskStorage) SETELAH proses selesai
    const cleanupTempFile = () => {
        if (typeof fileData === 'string') {
            fs.unlink(fileData, (err) => {
                if (err && err.code !== 'ENOENT') console.warn("Temp file cleanup failed:", err.message);
            });
        }
    };

    if (confidence >= this.threshold || localData.is_unknown) {
      console.log(`✅ [AI Service] Confidence Tinggi (${confidence}%). Menggunakan hasil lokal.`);
      cleanupTempFile();
      return {
        ...localData,
        source: "local",
        fishName: localData.best_display_name || 'Ikan Tidak Teridentifikasi',
        models: flaskResponse.models
      };
    }

    if (!this.openRouterKey) {
        console.warn(`⚠️ [AI Service] Confidence Rendah (${confidence}%) tapi API Key OpenRouter kosong. Fallback ke lokal.`);
        cleanupTempFile();
        return { ...localData, source: "local", fishName: localData.best_display_name };
    }

    console.log(`☁️ [AI Service] Confidence Rendah (${confidence}%). Memanggil OpenRouter...`);
    try {
        const cloudResult = await this.openRouterDetection(fileData, flaskResponse);
        console.log(`☁️ [AI Service] OpenRouter Result:`, cloudResult);
        
        let finalClass = cloudResult.class;
        let displayName = 'Ikan Tidak Teridentifikasi';

        if (finalClass !== 'unknown' && FAMILY_TO_LOCAL[finalClass]) {
           displayName = FAMILY_TO_LOCAL[finalClass];
        } else if (finalClass !== 'unknown') {
           displayName = finalClass; 
        }

        cleanupTempFile();
        return {
            ...localData,
            best_class: finalClass,
            best_display_name: displayName,
            best_percentage: (cloudResult.confidence * 100).toFixed(2),
            source: "cloud",
            fishName: displayName,
            models: flaskResponse.models,
            openrouter_support: true
        };
    } catch (error) {
        console.error("❌ [AI Service] OpenRouter Gagal, Fallback ke Lokal:", error.message);
        cleanupTempFile();
        return {
            ...localData,
            source: "local_fallback",
            fishName: localData.best_display_name,
            models: flaskResponse.models
        };
    }
  }
}

module.exports = new AIService();

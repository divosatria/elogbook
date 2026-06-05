import logging
import base64
import requests
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load env variables from backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from functools import lru_cache
# pyrefly: ignore [missing-import]
from PIL import UnidentifiedImageError

try:
    from predict_model import (
        get_available_checkpoints,
        get_device,
        load_image_bytes,
        load_model,
        predict_pil_image,
        resolve_checkpoint_path,
    )
except ModuleNotFoundError:
    from .predict_model import (
        get_available_checkpoints,
        get_device,
        load_image_bytes,
        load_model,
        predict_pil_image,
        resolve_checkpoint_path,
    )

DEFAULT_TOP_K = 3
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

# Threshold confidence (%) — jika model lokal di bawah ini, panggil OpenRouter
OPENROUTER_THRESHOLD = float(os.environ.get("OPENROUTER_THRESHOLD", "70"))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

DEVICE = get_device()

FAMILY_TO_LOCAL = {
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
}

def build_checkpoint_options() -> list[str]:
    """Bangun daftar checkpoint yang tersedia untuk inferensi."""
    options = []
    for checkpoint_path in get_available_checkpoints():
        try:
            options.append(str(checkpoint_path))
        except Exception:
            pass
    return options

CHECKPOINT_OPTIONS = build_checkpoint_options()

@lru_cache(maxsize=8)
def get_inference_bundle(checkpoint_value: str):
    """Load model sekali per checkpoint lalu simpan di cache."""
    checkpoint_path = resolve_checkpoint_path(checkpoint_value)
    return load_model(checkpoint_path, DEVICE)

def run_model_prediction(image, checkpoint_value: str, top_k: int) -> dict:
    """Jalankan inferensi untuk satu checkpoint terpilih."""
    checkpoint_path = resolve_checkpoint_path(checkpoint_value)
    (
        model,
        class_names,
        transform,
        model_name,
        image_size,
        ood_thresholds,
        class_profiles,
    ) = get_inference_bundle(checkpoint_value)
    
    inference = predict_pil_image(
        image=image,
        model=model,
        class_names=class_names,
        transform=transform,
        device=DEVICE,
        top_k=top_k,
        ood_thresholds=ood_thresholds,
        class_profiles=class_profiles,
    )
    
    checkpoint_label = checkpoint_path.name
    display_class = "unknown" if inference["is_unknown"] else inference["predicted_class"]
    class_profile = inference.get("class_profile")

    return {
        "checkpoint_label": checkpoint_label,
        "predictions": [
            {
                "class_name": prediction["class_name"],
                "display_name": FAMILY_TO_LOCAL.get(prediction["class_name"], class_profiles[prediction["class_name"]]["display_name"] if class_profiles and prediction["class_name"] in class_profiles else prediction["class_name"]),
                "probability": prediction["probability"],
                "percentage": round(float(prediction["probability"]) * 100, 2),
            }
            for prediction in inference["predictions"]
        ],
        "best_class": display_class,
        "best_display_name": FAMILY_TO_LOCAL.get(display_class, class_profile["display_name"] if class_profile else display_class),
        "best_probability": float(inference["predicted_probability"]),
        "best_percentage": round(float(inference["predicted_probability"]) * 100, 2),
        "is_unknown": inference["is_unknown"],
        "rejection_reason": inference.get("rejection_reason")
    }

def pick_best_model_result(model_results: list) -> dict:
    if not model_results:
        raise ValueError("Tidak ada hasil model untuk dipilih.")
    return max(
        model_results,
        key=lambda item: (
            0 if item["is_unknown"] else 1,
            float(item["best_probability"]),
        ),
    )

def aggregate_model_results(model_results: list) -> dict:
    if not model_results:
        raise ValueError("Tidak ada hasil model untuk diagregasi.")

    accepted_results = [item for item in model_results if not item["is_unknown"]]
    if not accepted_results:
        best_unknown = pick_best_model_result(model_results)
        return {
            "best_class": "unknown",
            "best_display_name": "unknown",
            "best_percentage": best_unknown["best_percentage"],
            "best_model_name": best_unknown["checkpoint_label"],
            "is_unknown": True,
        }

    class_stats = {}
    for item in accepted_results:
        class_name = str(item["best_class"])
        stats = class_stats.setdefault(
            class_name,
            {
                "votes": 0,
                "score_sum": 0.0,
                "best_result": item,
            },
        )
        stats["votes"] += 1
        stats["score_sum"] += float(item["best_probability"])
        if float(item["best_probability"]) > float(stats["best_result"]["best_probability"]):
            stats["best_result"] = item

    best_class, best_stats = max(
        class_stats.items(),
        key=lambda entry: (
            int(entry[1]["votes"]),
            float(entry[1]["score_sum"]),
            float(entry[1]["best_result"]["best_probability"]),
        ),
    )
    representative = best_stats["best_result"]
    return {
        "best_class": best_class,
        "best_display_name": representative.get("best_display_name", best_class),
        "best_percentage": representative["best_percentage"],
        "best_model_name": representative["checkpoint_label"],
        "is_unknown": False,
        "confidence": representative["best_probability"]
    }

def call_openrouter_vision(image_bytes: bytes, top_k_classes: list) -> dict:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return {"error": "API Key missing"}
        
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        valid_classes_str = ", ".join([f"'{k}' ({v})" for k, v in FAMILY_TO_LOCAL.items()])
        
        prompt = (
            f"You are an expert marine biologist. Analyze this fish image. "
            f"Identify the fish from this specific list of families: {valid_classes_str}. "
            f"The local model predicted it might be one of these: {', '.join(top_k_classes)}. "
            f"Reply ONLY with a JSON object exactly like this: "
            f'{{"class": "family_name_from_list", "confidence": 0.95}} '
            f"If it is definitely not a fish or not in the list, return {{\"class\": \"unknown\", \"confidence\": 1.0}}."
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "E-Logbook AI",
            "Content-Type": "application/json"
        }
        
        # Load model dari env secara ketat tanpa fallback hardcode
        or_model = os.environ.get("OPENROUTER_MODEL")
        if not or_model:
            return {"error": "OPENROUTER_MODEL missing in .env"}
            
        payload = {
            "model": or_model,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            import json
            content = response.json()['choices'][0]['message']['content']
            parsed = json.loads(content)
            return parsed
        else:
            logging.error(f"OpenRouter Error: {response.text}")
            return {"error": response.text}
            
    except Exception as e:
        logging.error(f"Failed to call OpenRouter: {e}")
        return {"error": str(e)}

@app.route('/api/predict', methods=['POST'])
def predict():
    if not CHECKPOINT_OPTIONS:
        return jsonify({"success": False, "message": "Belum ada checkpoint model yang tersedia."}), 500

    uploaded_file = request.files.get("image")
    if not uploaded_file:
        return jsonify({"success": False, "message": "Tidak ada gambar yang diupload."}), 400

    image_bytes = uploaded_file.read()
    if not image_bytes:
        return jsonify({"success": False, "message": "File gambar kosong."}), 400

    logging.info(f"Received image: {len(image_bytes)} bytes, first 4 hex: {image_bytes[:4].hex()}")

    try:
        image = load_image_bytes(image_bytes)
    except (UnidentifiedImageError, OSError) as exc:
        logging.error(f"Image load failed: {type(exc).__name__}: {exc}")
        return jsonify({"success": False, "message": "File bukan gambar yang valid atau rusak."}), 400

    try:
        # 1. Run local model prediction
        model_results = [
            run_model_prediction(image, option, DEFAULT_TOP_K)
            for option in CHECKPOINT_OPTIONS
        ]
        
        final_result = aggregate_model_results(model_results)
        local_confidence = float(final_result.get("best_percentage", 0))
        openrouter_res = None

        # 2. Cek apakah perlu bantuan OpenRouter
        if local_confidence < OPENROUTER_THRESHOLD:
            # Confidence rendah → minta OpenRouter untuk validasi/koreksi
            logging.info(
                f"Confidence lokal {local_confidence:.1f}% < threshold {OPENROUTER_THRESHOLD}% → memanggil OpenRouter..."
            )
            
            top_k = []
            if model_results and "predictions" in model_results[0]:
                top_k = [p["class_name"] for p in model_results[0]["predictions"]]
            
            openrouter_res = call_openrouter_vision(image_bytes, top_k)
            
            if "error" not in openrouter_res and "class" in openrouter_res:
                or_class = openrouter_res["class"]
                if or_class in FAMILY_TO_LOCAL or or_class == "unknown":
                    if or_class != final_result["best_class"]:
                        logging.info(f"OpenRouter override: {final_result['best_class']} -> {or_class}")
                        final_result["best_class"] = or_class
                        if or_class == "unknown":
                            final_result["best_display_name"] = "unknown"
                            final_result["is_unknown"] = True
                        else:
                            final_result["best_display_name"] = FAMILY_TO_LOCAL[or_class]
                            final_result["is_unknown"] = False
                        
                        if "confidence" in openrouter_res:
                            final_result["confidence"] = float(openrouter_res["confidence"])
                            final_result["best_percentage"] = round(float(openrouter_res["confidence"]) * 100, 2)
                            
                    final_result["openrouter_support"] = True
                    final_result["decision_reason"] = f"Confidence lokal ({local_confidence:.1f}%) di bawah threshold ({OPENROUTER_THRESHOLD}%), menggunakan OpenRouter untuk validasi"
                else:
                    final_result["openrouter_support"] = False
                    final_result["decision_reason"] = f"OpenRouter mengembalikan kelas tidak dikenal: {or_class}"
            else:
                final_result["openrouter_support"] = False
                final_result["decision_reason"] = f"OpenRouter gagal: {openrouter_res.get('error', 'unknown error')}"
        else:
            # Confidence tinggi → cukup pakai model lokal saja
            logging.info(
                f"Confidence lokal {local_confidence:.1f}% >= threshold {OPENROUTER_THRESHOLD}% → cukup pakai model lokal"
            )
            final_result["openrouter_support"] = False
            final_result["decision_reason"] = f"Confidence lokal ({local_confidence:.1f}%) sudah di atas threshold ({OPENROUTER_THRESHOLD}%), tidak perlu OpenRouter"

        return jsonify({
            "success": True,
            "data": final_result,
            "models": model_results,
            "openrouter_raw": openrouter_res
        })

    except Exception as exc:
        logging.exception("Gagal menjalankan inferensi")
        return jsonify({"success": False, "message": f"Terjadi kesalahan internal: {str(exc)}"}), 500

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"success": False, "message": "Ukuran file terlalu besar. Maksimal 10 MB."}), 413

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)

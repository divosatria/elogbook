"""
predict_model.py — Inferensi gambar tangkapan laut menggunakan model terbaik.

Penggunaan:
    python predict_model.py <input_path> [--top-k N] [--save-csv hasil.csv] [--checkpoint path]
"""

from __future__ import annotations

import argparse
import csv
import logging
import re
import sys
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, TypedDict, cast

import torch
from PIL import Image, UnidentifiedImageError
from torch import nn
from torchvision import transforms
from torchvision.models import (
    efficientnet_b0,
    mobilenet_v3_small,
    resnet18,
)

try:
    from class_profiles import DEFAULT_CLASS_PROFILES, PROFILE_VERSION
except ModuleNotFoundError:
    from .class_profiles import DEFAULT_CLASS_PROFILES, PROFILE_VERSION

# ---------------------------------------------------------------------------
# Konstanta
# ---------------------------------------------------------------------------

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
DEFAULT_CHECKPOINT_CANDIDATES = (
    MODEL_DIR / "efficientnet_b0_best.pt",
    MODEL_DIR / "resnet18_best.pt",
    MODEL_DIR / "mobilenet_v3_small_best.pt",
    BASE_DIR / "model.pt",
)
IMAGE_SCORE_WEIGHT = 0.8
TRAIT_SCORE_WEIGHT = 0.2

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Hanya buat logger untuk module ini. basicConfig() TIDAK dipanggil di sini
# agar saat file ini di-import sebagai module, konfigurasi logging global
# aplikasi pemanggil tidak ikut diubah. basicConfig() dipanggil di main().
logger = logging.getLogger(__name__)


class PredictionResult(TypedDict):
    class_name: str
    probability: float


class OODThresholds(TypedDict):
    confidence_threshold: float
    entropy_threshold: float | None


class ClassProfile(TypedDict):
    display_name: str
    summary: str
    visual_traits: list[str]
    keywords: list[str]
    caution: str


class InferenceResult(TypedDict):
    predictions: list[PredictionResult]
    predicted_class: str
    predicted_probability: float
    image_probability: float
    trait_score: float
    combined_score: float
    entropy: float
    is_unknown: bool
    rejection_reason: str | None
    observed_traits: list[str]
    matched_traits: list[str]
    class_profile: ClassProfile | None


TransformFn = Callable[[Image.Image], torch.Tensor]


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

def get_device() -> torch.device:
    """Pilih device: CUDA jika tersedia, lainnya CPU."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Menggunakan device: %s", device)
    return device


# ---------------------------------------------------------------------------
# Transform
# ---------------------------------------------------------------------------

def build_eval_transform(image_size: int) -> TransformFn:
    """Buat pipeline transformasi untuk inferensi (tanpa augmentasi)."""
    return cast(
        TransformFn,
        transforms.Compose(
            [
                transforms.Resize(int(image_size * 1.15)),
                transforms.CenterCrop(image_size),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            ]
        ),
    )


# ---------------------------------------------------------------------------
# Pembuatan model
# ---------------------------------------------------------------------------

def get_model(model_name: str, num_classes: int, dropout: float = 0.2) -> nn.Module:
    """
    Buat arsitektur model sesuai nama, dengan jumlah kelas dan dropout yang diberikan.

    Args:
        model_name: Salah satu dari "resnet18", "efficientnet_b0", "mobilenet_v3_small".
        num_classes: Jumlah kelas output.
        dropout: Probabilitas dropout pada layer terakhir.

    Returns:
        Model PyTorch yang belum di-load bobotnya.

    Raises:
        ValueError: Jika model_name tidak dikenal.
    """
    model_name = model_name.lower()

    if model_name == "resnet18":
        model = resnet18(weights=None)
        in_features = cast(nn.Linear, model.fc).in_features
        setattr(model, "fc", nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes)))
        return model

    if model_name == "efficientnet_b0":
        model = efficientnet_b0(weights=None)
        in_features = cast(nn.Linear, model.classifier[1]).in_features
        model.classifier = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
        return model

    if model_name == "mobilenet_v3_small":
        model = mobilenet_v3_small(weights=None)
        first_linear = cast(nn.Linear, model.classifier[0])
        final_linear = cast(nn.Linear, model.classifier[3])
        model.classifier = nn.Sequential(
            nn.Linear(first_linear.in_features, first_linear.out_features),
            nn.Hardswish(),
            nn.Dropout(dropout),
            nn.Linear(final_linear.in_features, num_classes),
        )
        return model

    raise ValueError(
        f"Model '{model_name}' belum didukung. "
        f"Pilihan yang tersedia: resnet18, efficientnet_b0, mobilenet_v3_small."
    )


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------

def resolve_checkpoint_path(checkpoint_arg: str | None) -> Path:
    """
    Temukan path checkpoint yang valid.

    Jika `checkpoint_arg` diberikan, path tersebut yang dipakai.
    Jika tidak, cari di DEFAULT_CHECKPOINT_CANDIDATES secara urutan.

    Raises:
        FileNotFoundError: Jika tidak ada checkpoint yang ditemukan.
    """
    if checkpoint_arg:
        checkpoint_path = Path(checkpoint_arg)
        if not checkpoint_path.is_absolute():
            checkpoint_path = BASE_DIR / checkpoint_path
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint tidak ditemukan: {checkpoint_path}")
        return checkpoint_path

    for candidate in DEFAULT_CHECKPOINT_CANDIDATES:
        if candidate.exists():
            return candidate

    searched = "\n".join(f"  - {c}" for c in DEFAULT_CHECKPOINT_CANDIDATES)
    raise FileNotFoundError(
        f"Tidak ada checkpoint model yang ditemukan. Path yang dicek:\n{searched}"
    )


def get_available_checkpoints() -> list[Path]:
    """Kembalikan daftar checkpoint yang tersedia untuk inferensi."""
    candidates = {
        path.resolve()
        for path in MODEL_DIR.glob("*.pt")
        if path.is_file()
    }
    for candidate in DEFAULT_CHECKPOINT_CANDIDATES:
        if candidate.exists():
            candidates.add(candidate.resolve())
    return sorted(candidates)


def get_default_checkpoint_value() -> str:
    """Nilai checkpoint default untuk UI dan CLI."""
    checkpoint_path = resolve_checkpoint_path(None)
    try:
        return checkpoint_path.resolve().relative_to(BASE_DIR).as_posix()
    except ValueError:
        return str(checkpoint_path.resolve())


def _normalize_ood_thresholds(raw_thresholds: object) -> OODThresholds | None:
    if not isinstance(raw_thresholds, dict):
        return None

    confidence_threshold = raw_thresholds.get("confidence_threshold")
    entropy_threshold = raw_thresholds.get("entropy_threshold")
    if confidence_threshold is None:
        return None

    return {
        "confidence_threshold": float(confidence_threshold),
        "entropy_threshold": (
            None if entropy_threshold is None else float(entropy_threshold)
        ),
    }


def _normalize_class_profiles(raw_profiles: object) -> dict[str, ClassProfile]:
    if not isinstance(raw_profiles, dict):
        raw_profiles = DEFAULT_CLASS_PROFILES

    normalized: dict[str, ClassProfile] = {}
    for class_name, profile in raw_profiles.items():
        if not isinstance(class_name, str) or not isinstance(profile, dict):
            continue
        normalized[class_name] = {
            "display_name": str(profile.get("display_name", class_name)),
            "summary": str(profile.get("summary", "")),
            "visual_traits": [str(item) for item in profile.get("visual_traits", [])],
            "keywords": [str(item) for item in profile.get("keywords", [])],
            "caution": str(profile.get("caution", "")),
        }
    return normalized


def parse_observed_traits(raw_value: str | None) -> list[str]:
    if raw_value is None:
        return []
    pieces = re.split(r"[,;\n]+", raw_value)
    cleaned = []
    seen: set[str] = set()
    for piece in pieces:
        text = " ".join(piece.strip().lower().split())
        if not text or text in seen:
            continue
        seen.add(text)
        cleaned.append(text)
    return cleaned


def _trait_matches_profile(trait: str, profile: ClassProfile) -> bool:
    haystacks = [keyword.lower() for keyword in profile["keywords"]]
    haystacks.extend(item.lower() for item in profile["visual_traits"])
    haystacks.append(profile["summary"].lower())
    return any(trait in haystack or haystack in trait for haystack in haystacks)


def _score_traits(
    class_name: str,
    class_profiles: dict[str, ClassProfile],
    observed_traits: list[str],
) -> tuple[float, list[str], ClassProfile | None]:
    profile = class_profiles.get(class_name)
    if profile is None or not observed_traits:
        return 0.0, [], profile

    matched_traits = [trait for trait in observed_traits if _trait_matches_profile(trait, profile)]
    score = len(matched_traits) / max(1, len(observed_traits))
    return score, matched_traits, profile


def load_model(
    checkpoint_path: Path,
    device: torch.device,
) -> tuple[nn.Module, list[str], TransformFn, str, int, OODThresholds | None, dict[str, ClassProfile]]:
    """
    Load model dari checkpoint.

    Returns:
        Tuple berisi (model, class_names, transform, model_name, image_size, ood_thresholds, class_profiles).

    Raises:
        KeyError: Jika checkpoint tidak memiliki key yang dibutuhkan.
        RuntimeError: Jika state_dict tidak cocok dengan arsitektur model.
    """
    logger.info("Memuat checkpoint: %s", checkpoint_path)
    # weights_only=False diperlukan karena checkpoint menyimpan objek Python
    # (dict dengan class_names, best_config, dll.), bukan tensor saja.
    # PERINGATAN KEAMANAN: Jangan load checkpoint dari sumber yang tidak dipercaya
    # karena pickle dapat mengeksekusi kode arbitrer saat di-deserialisasi.
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)

    required_keys = {"model_name", "class_names", "best_config", "state_dict"}
    missing = required_keys - checkpoint.keys()
    if missing:
        raise KeyError(f"Checkpoint tidak memiliki key: {missing}")

    model_name: str = checkpoint["model_name"]
    class_names: list[str] = checkpoint["class_names"]
    best_config: dict = checkpoint["best_config"]
    ood_thresholds = _normalize_ood_thresholds(checkpoint.get("ood_thresholds"))
    class_profiles = _normalize_class_profiles(checkpoint.get("class_profiles"))
    dropout = float(best_config.get("dropout", 0.2))
    image_size = int(best_config.get("image_size", 224))

    model = get_model(model_name=model_name, num_classes=len(class_names), dropout=dropout).to(device)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    transform = build_eval_transform(image_size=image_size)

    logger.info(
        "Model dimuat: %s | Kelas: %d | Image size: %d",
        model_name,
        len(class_names),
        image_size,
    )
    if ood_thresholds:
        logger.info(
            "OOD thresholds aktif: confidence >= %.3f | entropy <= %s",
            ood_thresholds["confidence_threshold"],
            (
                f"{ood_thresholds['entropy_threshold']:.3f}"
                if ood_thresholds["entropy_threshold"] is not None
                else "None"
            ),
        )
    logger.info(
        "Profil ciri tersedia: %d kelas | versi: %s",
        len(class_profiles),
        checkpoint.get("class_profile_version", PROFILE_VERSION),
    )
    return model, class_names, transform, model_name, image_size, ood_thresholds, class_profiles


# ---------------------------------------------------------------------------
# Pengumpulan gambar
# ---------------------------------------------------------------------------

def collect_images(input_path: Path) -> list[Path]:
    """
    Kumpulkan semua path gambar dari file atau folder.

    Raises:
        FileNotFoundError: Jika input_path tidak ada.
        ValueError: Jika tidak ada gambar yang ditemukan.
    """
    if not input_path.exists():
        raise FileNotFoundError(f"Path tidak ditemukan: {input_path}")

    if input_path.is_file():
        if input_path.suffix.lower() not in VALID_EXTENSIONS:
            raise ValueError(
                f"Format file tidak didukung: '{input_path.suffix}'. "
                f"Format yang valid: {', '.join(sorted(VALID_EXTENSIONS))}"
            )
        return [input_path]

    images = sorted(
        path
        for path in input_path.rglob("*")
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
    )

    if not images:
        raise ValueError(
            f"Tidak ada gambar yang ditemukan di folder: {input_path}\n"
            f"Format yang didukung: {', '.join(sorted(VALID_EXTENSIONS))}"
        )

    logger.info("Ditemukan %d gambar di: %s", len(images), input_path)
    return images


# ---------------------------------------------------------------------------
# Prediksi
# ---------------------------------------------------------------------------

def _build_inference_result(
    probabilities: torch.Tensor,
    class_names: list[str],
    top_k: int,
    ood_thresholds: OODThresholds | None = None,
    observed_traits: list[str] | None = None,
    class_profiles: dict[str, ClassProfile] | None = None,
) -> InferenceResult:
    k = min(top_k, len(class_names))
    normalized_traits = observed_traits or []
    active_profiles = class_profiles or {}
    class_rows: list[dict[str, Any]] = []
    for idx, class_name in enumerate(class_names):
        image_probability = float(probabilities[idx].item())
        trait_score, matched_traits, profile = _score_traits(
            class_name=class_name,
            class_profiles=active_profiles,
            observed_traits=normalized_traits,
        )
        combined_score = image_probability
        if normalized_traits:
            combined_score = (
                IMAGE_SCORE_WEIGHT * image_probability
                + TRAIT_SCORE_WEIGHT * trait_score
            )
        class_rows.append(
            {
                "class_name": class_name,
                "probability": image_probability,
                "image_probability": image_probability,
                "trait_score": trait_score,
                "combined_score": combined_score,
                "matched_traits": matched_traits,
                "class_profile": profile,
            }
        )

    class_rows.sort(key=lambda item: float(item["combined_score"]), reverse=True)
    top_rows = class_rows[:k]
    predictions: list[PredictionResult] = [
        {
            "class_name": str(row["class_name"]),
            "probability": float(row["combined_score"]),
        }
        for row in top_rows
    ]

    best_row = top_rows[0]
    best_prediction = predictions[0]
    confidence = float(best_row["image_probability"])
    entropy = float(-(probabilities * torch.log(probabilities.clamp_min(1e-12))).sum().item())

    rejection_reasons: list[str] = []
    if ood_thresholds is not None:
        if confidence < ood_thresholds["confidence_threshold"]:
            rejection_reasons.append(
                f"confidence {confidence:.3f} < {ood_thresholds['confidence_threshold']:.3f}"
            )
        entropy_threshold = ood_thresholds.get("entropy_threshold")
        if entropy_threshold is not None and entropy > entropy_threshold:
            rejection_reasons.append(f"entropy {entropy:.3f} > {entropy_threshold:.3f}")

    return {
        "predictions": predictions,
        "predicted_class": "unknown" if rejection_reasons else best_prediction["class_name"],
        "predicted_probability": confidence,
        "image_probability": float(best_row["image_probability"]),
        "trait_score": float(best_row["trait_score"]),
        "combined_score": float(best_row["combined_score"]),
        "entropy": entropy,
        "is_unknown": bool(rejection_reasons),
        "rejection_reason": "; ".join(rejection_reasons) if rejection_reasons else None,
        "observed_traits": normalized_traits,
        "matched_traits": list(best_row["matched_traits"]),
        "class_profile": cast(ClassProfile | None, best_row["class_profile"]),
    }


@torch.no_grad()
def predict_pil_image(
    image: Image.Image,
    model: nn.Module,
    class_names: list[str],
    transform: TransformFn,
    device: torch.device,
    top_k: int = 3,
    ood_thresholds: OODThresholds | None = None,
    observed_traits: list[str] | None = None,
    class_profiles: dict[str, ClassProfile] | None = None,
) -> InferenceResult:
    """Prediksi kelas untuk objek PIL Image."""
    rgb_image = image.convert("RGB")
    image_tensor = transform(rgb_image)
    tensor = image_tensor.unsqueeze(0).to(device, non_blocking=True)
    logits = model(tensor)
    probabilities = torch.softmax(logits, dim=1)[0]
    return _build_inference_result(
        probabilities=probabilities,
        class_names=class_names,
        top_k=top_k,
        ood_thresholds=ood_thresholds,
        observed_traits=observed_traits,
        class_profiles=class_profiles,
    )


def load_image_bytes(image_bytes: bytes) -> Image.Image:
    """Buka bytes gambar menjadi PIL Image."""
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        return image
    except (UnidentifiedImageError, OSError) as exc:
        raise UnidentifiedImageError("Gambar upload tidak valid atau rusak.") from exc


@torch.no_grad()
def predict_image(
    image_path: Path,
    model: nn.Module,
    class_names: list[str],
    transform: TransformFn,
    device: torch.device,
    top_k: int = 3,
    ood_thresholds: OODThresholds | None = None,
    observed_traits: list[str] | None = None,
    class_profiles: dict[str, ClassProfile] | None = None,
) -> InferenceResult:
    """
    Prediksi kelas gambar tunggal.

    Args:
        image_path: Path gambar yang akan diprediksi.
        model: Model PyTorch yang sudah di-load.
        class_names: Daftar nama kelas.
        transform: Pipeline transformasi gambar.
        device: Device untuk inferensi.
        top_k: Jumlah prediksi teratas yang dikembalikan.

    Returns:
        Dict hasil inferensi berisi top-k prediksi, keputusan akhir, entropy,
        dan status apakah gambar ditolak sebagai unknown.

    Raises:
        UnidentifiedImageError: Jika file gambar corrupt atau tidak valid.
    """
    k = min(top_k, len(class_names))

    try:
        with Image.open(image_path) as img:
            image = img.copy()
    except (UnidentifiedImageError, OSError) as exc:
        raise UnidentifiedImageError(f"Gagal membuka gambar: {image_path}") from exc

    return predict_pil_image(
        image=image,
        model=model,
        class_names=class_names,
        transform=transform,
        device=device,
        top_k=k,
        ood_thresholds=ood_thresholds,
        observed_traits=observed_traits,
        class_profiles=class_profiles,
    )


def run_batch_prediction(
    image_paths: list[Path],
    model: nn.Module,
    class_names: list[str],
    transform: TransformFn,
    device: torch.device,
    top_k: int,
    ood_thresholds: OODThresholds | None = None,
    observed_traits: list[str] | None = None,
    class_profiles: dict[str, ClassProfile] | None = None,
) -> list[dict[str, object]]:
    """
    Jalankan prediksi untuk sekumpulan gambar dan kembalikan hasilnya sebagai list row CSV.

    Gambar yang gagal dibaca akan di-skip dengan peringatan, bukan menghentikan program.
    """
    rows: list[dict[str, object]] = []

    for idx, image_path in enumerate(image_paths, start=1):
        logger.info("[%d/%d] Memproses: %s", idx, len(image_paths), image_path.name)

        try:
            inference = predict_image(
                image_path,
                model,
                class_names,
                transform,
                device,
                top_k,
                ood_thresholds=ood_thresholds,
                observed_traits=observed_traits,
                class_profiles=class_profiles,
            )
        except (UnidentifiedImageError, OSError) as exc:
            logger.warning("  SKIP — %s", exc)
            continue

        logger.info(
            "  => %s (%.2f%%)%s",
            inference["predicted_class"],
            float(inference["predicted_probability"]) * 100,
            (
                f" | ditolak sebagai unknown: {inference['rejection_reason']}"
                if inference["is_unknown"]
                else ""
            ),
        )
        if inference["observed_traits"]:
            logger.info(
                "     ciri masuk: %s | matched: %s | trait_score=%.3f | combined=%.3f",
                ", ".join(inference["observed_traits"]),
                ", ".join(inference["matched_traits"]) if inference["matched_traits"] else "-",
                float(inference["trait_score"]),
                float(inference["combined_score"]),
            )
        for rank, pred in enumerate(inference["predictions"], start=1):
            logger.info(
                "     top-%d: %s (%.4f)",
                rank,
                pred["class_name"],
                pred["probability"],
            )

        row: dict[str, object] = {
            "image_path": str(image_path),
            "predicted_class": inference["predicted_class"],
            "predicted_probability": inference["predicted_probability"],
            "image_probability": inference["image_probability"],
            "trait_score": inference["trait_score"],
            "combined_score": inference["combined_score"],
            "is_unknown": inference["is_unknown"],
            "entropy": inference["entropy"],
            "rejection_reason": inference["rejection_reason"],
            "observed_traits": ", ".join(inference["observed_traits"]),
            "matched_traits": ", ".join(inference["matched_traits"]),
        }
        for rank, pred in enumerate(inference["predictions"], start=1):
            row[f"top_{rank}_class"] = pred["class_name"]
            row[f"top_{rank}_probability"] = pred["probability"]

        rows.append(row)

    return rows


# ---------------------------------------------------------------------------
# Simpan CSV
# ---------------------------------------------------------------------------

def save_csv(rows: list[dict[str, object]], csv_path: Path) -> None:
    """Simpan hasil prediksi ke file CSV."""
    if not rows:
        logger.warning("Tidak ada hasil untuk disimpan ke CSV.")
        return

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())

    with open(csv_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    logger.info("Hasil disimpan ke: %s (%d baris)", csv_path, len(rows))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prediksi gambar tangkapan laut dengan model terbaik.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("input_path", help="Path gambar tunggal atau folder gambar.")
    parser.add_argument(
        "--top-k",
        type=int,
        default=3,
        help="Jumlah prediksi teratas yang ditampilkan (minimal 1).",
    )
    parser.add_argument("--save-csv", help="Simpan hasil ke file CSV (opsional).")
    parser.add_argument(
        "--traits",
        help="Ciri-ciri visual opsional, pisahkan dengan koma. Contoh: 'mata besar, merah, badan pipih'.",
    )
    parser.add_argument(
        "--checkpoint",
        help="Path checkpoint (relatif dari folder script atau absolut). "
             "Jika tidak diberikan, checkpoint default akan dicari otomatis.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Kurangi output log (hanya tampilkan WARNING ke atas).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """
    Entry point utama. Mengembalikan exit code (0 = sukses, 1 = gagal).
    """
    if not logging.root.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%H:%M:%S",
        )

    args = parse_args(argv)

    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)

    if args.top_k < 1:
        logger.error("Nilai --top-k harus minimal 1, diberikan: %d", args.top_k)
        return 1

    try:
        device = get_device()
        checkpoint_path = resolve_checkpoint_path(args.checkpoint)
        model, class_names, transform, model_name, image_size, ood_thresholds, class_profiles = load_model(
            checkpoint_path,
            device,
        )
        image_paths = collect_images(Path(args.input_path))
    except (FileNotFoundError, ValueError, KeyError, RuntimeError) as exc:
        logger.error("%s", exc)
        return 1

    rows = run_batch_prediction(
        image_paths=image_paths,
        model=model,
        class_names=class_names,
        transform=transform,
        device=device,
        top_k=args.top_k,
        ood_thresholds=ood_thresholds,
        observed_traits=parse_observed_traits(args.traits),
        class_profiles=class_profiles,
    )

    skipped = len(image_paths) - len(rows)
    if not rows:
        logger.error(
            "Tidak ada gambar yang berhasil diproses. "
            "Semua %d gambar di-skip karena error.",
            len(image_paths),
        )
        return 1

    if skipped > 0:
        logger.warning("%d dari %d gambar di-skip karena error.", skipped, len(image_paths))

    if args.save_csv:
        try:
            save_csv(rows, Path(args.save_csv))
        except OSError as exc:
            logger.error("Gagal menyimpan CSV: %s", exc)
            return 1

    logger.info("Selesai. Berhasil: %d | Di-skip: %d", len(rows), skipped)
    return 0


if __name__ == "__main__":
    sys.exit(main())

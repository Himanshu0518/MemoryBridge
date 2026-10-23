"""
face_pipeline.py
================
Stage 1 — Face Detection  (MTCNN)
Stage 2 — Face Embedding  (FaceNet via facenet-pytorch)

How it works:
    1. detect_faces()  → finds bounding boxes of every face in an image
    2. get_embedding() → crops each face and converts it to a 512-d vector
"""

import numpy as np
import cv2
from PIL import Image

# facenet-pytorch provides both MTCNN (detector) and InceptionResnetV1 (embedder)
from facenet_pytorch import MTCNN, InceptionResnetV1
import torch

# ── device ────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── models (loaded once at import time) ───────────────────────────────────────
# MTCNN: detects faces and returns aligned 160×160 crops ready for FaceNet
_detector = MTCNN(
    image_size=160,
    margin=20,
    keep_all=True,          # return ALL faces in the image, not just the best one
    device=DEVICE,
    post_process=True,      # normalise pixel values for FaceNet
)

# InceptionResnetV1 pretrained on VGGFace2 → 512-dimensional embeddings
_embedder = InceptionResnetV1(pretrained="vggface2").eval().to(DEVICE)


import io
from PIL import Image, ImageOps

# ── public helpers ─────────────────────────────────────────────────────────────

def decode_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert raw image bytes (from an HTTP upload) into an OpenCV BGR array,
    preserving correct EXIF orientation.
    """
    pil_img = load_image_rgb(image_bytes)
    rgb = np.array(pil_img)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def load_image_rgb(image_bytes: bytes) -> Image.Image:
    """
    Load raw image bytes into a PIL Image with correct EXIF orientation.
    """
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        return pil_img.convert("RGB")
    except Exception as e:
        raise ValueError("Could not decode image — make sure it is a valid JPEG/PNG.") from e


def detect_faces(image_bytes: bytes) -> list[dict]:
    """
    Stage 1: Detect all faces in an image.
    Supports EXIF-oriented and multi-angle smartphone photos.

    Returns a list of dicts, one per face:
        {
            "box":        [x1, y1, x2, y2],   # pixel coordinates
            "confidence": float,               # MTCNN detection confidence
            "face_crop":  torch.Tensor,        # aligned 160×160 crop (for embedding)
        }

    Returns an empty list when no face is found.
    """
    pil_img = load_image_rgb(image_bytes)

    # Try natural/EXIF orientation first; fallback to rotations if not found
    for angle in [0, 90, 270, 180]:
        test_img = pil_img if angle == 0 else pil_img.rotate(angle, expand=True)

        try:
            boxes, probs = _detector.detect(test_img)
            crops = _detector(test_img)
        except Exception:
            continue

        if boxes is not None and crops is not None and len(boxes) > 0:
            if isinstance(crops, torch.Tensor) and crops.ndim == 3:
                crops = crops.unsqueeze(0)

            results = []
            for i, (box, prob) in enumerate(zip(boxes, probs)):
                results.append({
                    "box":        [int(v) for v in box],
                    "confidence": float(prob) if prob is not None else 1.0,
                    "face_crop":  crops[i],
                })
            return results

    return []


def get_embedding(face_crop: torch.Tensor) -> list[float]:
    """
    Stage 2: Convert a single aligned face crop into a 512-d embedding vector.

    `face_crop` is the tensor returned inside each dict from detect_faces().

    Returns a plain Python list of 512 floats (ready to store in pgvector).
    """
    with torch.no_grad():
        # embedder expects a batch → unsqueeze adds the batch dimension
        tensor = face_crop.unsqueeze(0).to(DEVICE)
        embedding = _embedder(tensor)           # shape (1, 512)
        embedding = embedding.squeeze(0)        # shape (512,)

        # L2-normalise so cosine similarity == dot product later
        embedding = embedding / embedding.norm()

    return embedding.cpu().tolist()


def extract_embeddings(image_bytes: bytes) -> list[dict]:
    """
    Convenience wrapper: detect all faces AND generate their embeddings.

    Returns a list of dicts:
        {
            "box":        [x1, y1, x2, y2],
            "confidence": float,
            "embedding":  list[float],   # 512 floats
        }
    """
    faces = detect_faces(image_bytes)
    results = []
    for face in faces:
        emb = get_embedding(face["face_crop"])
        results.append({
            "box":        face["box"],
            "confidence": face["confidence"],
            "embedding":  emb,
        })
    return results

"""
convert_dataset.py
------------------
Converts LettuCeV YOLO segmentation dataset into
a clean classification dataset for EfficientNet training.

Input structure:
  LettuCeV_dataset/
  ├── images/   (651 .jpg files)
  └── labels/   (651 .txt files, YOLO segmentation format)

Output structure:
  ml/data/raw/
  ├── healthy/   (class 2 → bright white roots)
  └── diseased/  (class 1 → brown/rotting roots)

YOLO segmentation format per line:
  class_id x1 y1 x2 y2 x3 y3 ... (normalized polygon points)
"""

import os
import cv2
import numpy as np
from pathlib import Path

# ── CONFIG — UPDATE THESE PATHS ─────────────────────────
DATASET_DIR = Path(r"C:\Users\Chait\Downloads\LettuCeV_dataset")
OUTPUT_DIR  = Path(r"C:\Users\Chait\Desktop\AI_Root_HealthMonitor\ml\data\raw")
IMAGE_SIZE  = 224   # Final size for EfficientNet

# Class mapping confirmed from visual inspection
CLASS_MAP = {
    "1": "diseased",   # Brown/rotting roots
    "2": "healthy",    # White/clean roots
}
# ────────────────────────────────────────────────────────

IMAGES_DIR = DATASET_DIR / "images"
LABELS_DIR = DATASET_DIR / "labels"


def setup_output_folders():
    """Create output folder structure."""
    for class_name in CLASS_MAP.values():
        folder = OUTPUT_DIR / class_name
        folder.mkdir(parents=True, exist_ok=True)
        print(f"  ✅ Created: {folder}")


def polygon_to_bbox(polygon_points, img_w, img_h):
    """
    Convert normalized YOLO polygon points to a bounding box.
    Returns (x_min, y_min, x_max, y_max) in pixel coordinates.
    """
    # polygon_points is a flat list: [x1, y1, x2, y2, ...]
    xs = [polygon_points[i] * img_w for i in range(0, len(polygon_points), 2)]
    ys = [polygon_points[i] * img_h for i in range(1, len(polygon_points), 2)]

    x_min = max(0, int(min(xs)))
    y_min = max(0, int(min(ys)))
    x_max = min(img_w, int(max(xs)))
    y_max = min(img_h, int(max(ys)))

    return x_min, y_min, x_max, y_max


def add_padding(x_min, y_min, x_max, y_max, img_w, img_h, pad=20):
    """Add a small padding around the crop so we don't cut off root edges."""
    x_min = max(0, x_min - pad)
    y_min = max(0, y_min - pad)
    x_max = min(img_w, x_max + pad)
    y_max = min(img_h, y_max + pad)
    return x_min, y_min, x_max, y_max


def process_image(image_path, label_path):
    """
    Process one image+label pair.
    Returns list of (cropped_image, class_name) tuples.
    One image can have multiple labeled roots.
    """
    results = []

    # Read label file
    try:
        with open(label_path, "r") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"  ⚠️  Cannot read label {label_path.name}: {e}")
        return results

    if not lines:
        return results

    # Read image (lazy — only load if labels exist and are valid)
    img = None

    for line in lines:
        parts = line.strip().split()
        if len(parts) < 5:  # Need at least class_id + 2 points (4 coords)
            continue

        class_id = parts[0]
        if class_id not in CLASS_MAP:
            continue

        class_name = CLASS_MAP[class_id]

        # Load image only when needed
        if img is None:
            img = cv2.imread(str(image_path))
            if img is None:
                print(f"  ⚠️  Cannot read image {image_path.name}")
                return results
            img_h, img_w = img.shape[:2]

        # Parse polygon coordinates (everything after class_id)
        try:
            coords = [float(x) for x in parts[1:]]
        except ValueError:
            continue

        if len(coords) < 4:
            continue

        # Get bounding box from polygon
        x_min, y_min, x_max, y_max = polygon_to_bbox(coords, img_w, img_h)

        # Add padding
        x_min, y_min, x_max, y_max = add_padding(
            x_min, y_min, x_max, y_max, img_w, img_h, pad=30
        )

        # Validate crop dimensions
        if x_max <= x_min or y_max <= y_min:
            continue
        if (x_max - x_min) < 50 or (y_max - y_min) < 50:
            # Skip tiny crops — probably noise
            continue

        # Crop and resize
        crop = img[y_min:y_max, x_min:x_max]
        crop_resized = cv2.resize(crop, (IMAGE_SIZE, IMAGE_SIZE),
                                  interpolation=cv2.INTER_AREA)

        results.append((crop_resized, class_name))

    return results


def convert_dataset():
    """Main conversion function."""
    print("=" * 50)
    print("  LettuCeV Dataset Converter")
    print("=" * 50)

    # Setup folders
    print("\n📁 Setting up output folders...")
    setup_output_folders()

    # Get all image files
    image_files = list(IMAGES_DIR.glob("*.jpg")) + \
                  list(IMAGES_DIR.glob("*.jpeg")) + \
                  list(IMAGES_DIR.glob("*.png"))

    print(f"\n🔍 Found {len(image_files)} images")
    print("🔄 Processing...\n")

    # Counters
    saved = {"healthy": 0, "diseased": 0}
    skipped = 0

    for idx, image_path in enumerate(image_files):
        # Find matching label file
        label_path = LABELS_DIR / (image_path.stem + ".txt")

        if not label_path.exists():
            skipped += 1
            continue

        # Process this image
        crops = process_image(image_path, label_path)

        if not crops:
            skipped += 1
            continue

        # Save each crop
        for crop_idx, (crop, class_name) in enumerate(crops):
            # Build output filename
            out_name = f"{image_path.stem}_{crop_idx}.jpg"
            out_path = OUTPUT_DIR / class_name / out_name

            cv2.imwrite(str(out_path), crop,
                        [cv2.IMWRITE_JPEG_QUALITY, 95])
            saved[class_name] += 1

        # Progress update every 50 images
        if (idx + 1) % 50 == 0:
            print(f"  Processed {idx + 1}/{len(image_files)} images... "
                  f"(healthy: {saved['healthy']}, "
                  f"diseased: {saved['diseased']})")

    # Final summary
    print("\n" + "=" * 50)
    print("  ✅ CONVERSION COMPLETE")
    print("=" * 50)
    print(f"  Healthy images:  {saved['healthy']}")
    print(f"  Diseased images: {saved['diseased']}")
    print(f"  Total saved:     {sum(saved.values())}")
    print(f"  Skipped:         {skipped}")
    print(f"\n  Output saved to: {OUTPUT_DIR}")
    print("\n  Next step: Run dataset_prep.py to split into train/val")


if __name__ == "__main__":
    convert_dataset()
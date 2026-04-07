"""
dataset_prep.py
---------------
Takes raw images from ml/data/raw/
Splits into train/val (80/20)
Applies augmentation to multiply dataset size
"""

import os
import shutil
import random
from pathlib import Path
from PIL import Image
import torchvision.transforms as transforms
from torchvision.utils import save_image

# ── CONFIG ──────────────────────────────────────────────
RAW_DIR       = Path("ml/data/raw")
PROCESSED_DIR = Path("ml/data/processed")
CLASSES       = ["healthy", "diseased"]
TRAIN_SPLIT   = 0.8
AUGMENT_TIMES = 8
IMAGE_SIZE    = 224
SEED          = 42
# ────────────────────────────────────────────────────────

random.seed(SEED)

def split_raw_data():
    print("📂 Splitting raw data into train/val...")
    for cls in CLASSES:
        raw_cls_dir = RAW_DIR / cls
        if not raw_cls_dir.exists():
            print(f"  ⚠️  Skipping '{cls}' — folder not found")
            continue

        images = list(raw_cls_dir.glob("*.jpg")) + \
                 list(raw_cls_dir.glob("*.jpeg")) + \
                 list(raw_cls_dir.glob("*.png"))

        if len(images) == 0:
            print(f"  ⚠️  No images found in {raw_cls_dir}")
            continue

        random.shuffle(images)
        split_idx = int(len(images) * TRAIN_SPLIT)
        train_imgs = images[:split_idx]
        val_imgs   = images[split_idx:]

        print(f"  ✅ {cls}: {len(train_imgs)} train, {len(val_imgs)} val")

        for img_path in train_imgs:
            dst = PROCESSED_DIR / "train" / cls / img_path.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img_path, dst)

        for img_path in val_imgs:
            dst = PROCESSED_DIR / "val" / cls / img_path.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img_path, dst)

def augment_training_data():
    print(f"\n🔄 Augmenting training data ({AUGMENT_TIMES}x per image)...")

    augment = transforms.Compose([
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(degrees=30),
        transforms.ColorJitter(brightness=0.3, contrast=0.3,
                               saturation=0.3, hue=0.1),
        transforms.RandomResizedCrop(size=IMAGE_SIZE, scale=(0.7, 1.0)),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    for cls in CLASSES:
        train_cls_dir = PROCESSED_DIR / "train" / cls
        if not train_cls_dir.exists():
            continue

        images = list(train_cls_dir.glob("*.jpg")) + \
                 list(train_cls_dir.glob("*.png"))

        aug_count = 0
        for img_path in images:
            try:
                img = Image.open(img_path).convert("RGB")
                for i in range(AUGMENT_TIMES):
                    aug_tensor = augment(img)
                    save_name = f"aug_{i}_{img_path.stem}.png"
                    save_path = train_cls_dir / save_name
                    save_image(aug_tensor, str(save_path),
                               normalize=True,
                               value_range=(-2.5, 2.5))
                    aug_count += 1
            except Exception as e:
                print(f"  ⚠️  Skipping {img_path.name}: {e}")

        print(f"  ✅ {cls}: generated {aug_count} augmented images")

def verify_dataset():
    print("\n📊 Final Dataset Summary:")
    print("-" * 40)
    total = 0
    for split in ["train", "val"]:
        for cls in CLASSES:
            path = PROCESSED_DIR / split / cls
            if path.exists():
                count = len(list(path.glob("*")))
                total += count
                print(f"  {split}/{cls}: {count} images")
    print("-" * 40)
    print(f"  TOTAL: {total} images")
    print("\n✅ Dataset ready for training!")

if __name__ == "__main__":
    print("=" * 40)
    print("  ROOT HEALTH — Dataset Prep")
    print("=" * 40)
    split_raw_data()
    augment_training_data()
    verify_dataset()
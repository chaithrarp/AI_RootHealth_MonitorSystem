# ml/scripts/train.py
# ============================================================
#  ROOT HEALTH MONITOR — Model Training Script
#  Architecture : EfficientNetB0 (Transfer Learning)
#  Task         : Binary Classification (healthy vs diseased)
# ============================================================

import os
import copy
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# ─────────────────────────────────────────────
#  1. CONFIG — change these if needed
# ─────────────────────────────────────────────
CONFIG = {
    "data_dir"    : "ml/data/processed",   # where train/ and val/ live
    "model_dir"   : "ml/models",           # where we save the model
    "batch_size"  : 32,                    # images per batch (32 is safe for 6GB)
    "num_epochs"  : 30,                    # max training rounds
    "lr"          : 1e-4,                  # learning rate
    "img_size"    : 224,                   # EfficientNetB0 expects 224x224
    "num_classes" : 2,                     # healthy, diseased
    "patience"    : 5,                     # stop early if no improvement for 5 epochs
    "device"      : "cuda" if torch.cuda.is_available() else "cpu"
}

print(f"\n{'='*50}")
print(f"  ROOT HEALTH MONITOR — Training")
print(f"{'='*50}")
print(f"  Device   : {CONFIG['device'].upper()}")
print(f"  Epochs   : {CONFIG['num_epochs']}")
print(f"  Batch    : {CONFIG['batch_size']}")
print(f"  Image sz : {CONFIG['img_size']}x{CONFIG['img_size']}")
print(f"{'='*50}\n")

os.makedirs(CONFIG["model_dir"], exist_ok=True)

# ─────────────────────────────────────────────
#  2. DATA TRANSFORMS
#  Train  → augment a bit more + normalize
#  Val    → only resize + normalize (no augment)
# ─────────────────────────────────────────────
data_transforms = {
    "train": transforms.Compose([
        transforms.Resize((CONFIG["img_size"], CONFIG["img_size"])),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],   # ImageNet mean
                             [0.229, 0.224, 0.225])    # ImageNet std
    ]),
    "val": transforms.Compose([
        transforms.Resize((CONFIG["img_size"], CONFIG["img_size"])),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
}

# ─────────────────────────────────────────────
#  3. LOAD DATASET
# ─────────────────────────────────────────────
image_datasets = {
    split: datasets.ImageFolder(
        os.path.join(CONFIG["data_dir"], split),
        transform=data_transforms[split]
    )
    for split in ["train", "val"]
}

dataloaders = {
    split: DataLoader(
        image_datasets[split],
        batch_size=CONFIG["batch_size"],
        shuffle=(split == "train"),
        num_workers=0,        # 0 = main process only (required on Windows)
        pin_memory=True
    )
    for split in ["train", "val"]
}

class_names = image_datasets["train"].classes   # ['diseased', 'healthy']
print(f"  Classes found : {class_names}")
print(f"  Train samples : {len(image_datasets['train'])}")
print(f"  Val samples   : {len(image_datasets['val'])}\n")

# save class mapping so backend can use it later
class_to_idx = image_datasets["train"].class_to_idx
with open(os.path.join(CONFIG["model_dir"], "class_names.json"), "w") as f:
    json.dump({"classes": class_names, "class_to_idx": class_to_idx}, f)

# ─────────────────────────────────────────────
#  4. BUILD MODEL
#  Load pretrained EfficientNetB0
#  Freeze all layers except the last classifier
# ─────────────────────────────────────────────
def build_model(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights="IMAGENET1K_V1")

    # freeze all layers — we don't want to destroy pretrained weights
    for param in model.parameters():
        param.requires_grad = False

    # replace the final classifier with our own
    # EfficientNetB0's classifier input is 1280 features
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes)
    )
    return model

model = build_model(CONFIG["num_classes"])
model = model.to(CONFIG["device"])

total_params    = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"  Total params     : {total_params:,}")
print(f"  Trainable params : {trainable_params:,}  (only these update)\n")

# ─────────────────────────────────────────────
#  5. LOSS + OPTIMIZER + SCHEDULER
# ─────────────────────────────────────────────

# handle class imbalance — diseased has fewer samples
# weight = total / (num_classes * class_count)
train_counts = [len(os.listdir(os.path.join(CONFIG["data_dir"], "train", c)))
                for c in class_names]
total = sum(train_counts)
weights = torch.tensor(
    [total / (CONFIG["num_classes"] * c) for c in train_counts],
    dtype=torch.float
).to(CONFIG["device"])

criterion = nn.CrossEntropyLoss(weight=weights)
optimizer = optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),
    lr=CONFIG["lr"],
    weight_decay=1e-4
)
# reduce LR by 0.5 if val loss doesn't improve for 3 epochs
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="min", factor=0.5, patience=3
)

# ─────────────────────────────────────────────
#  6. TRAINING LOOP
# ─────────────────────────────────────────────
def train_model(model, dataloaders, criterion, optimizer, scheduler, config):
    best_model_wts = copy.deepcopy(model.state_dict())
    best_val_acc   = 0.0
    patience_count = 0
    history        = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    for epoch in range(config["num_epochs"]):
        print(f"Epoch {epoch+1}/{config['num_epochs']}  ", end="")
        epoch_start = time.time()

        for phase in ["train", "val"]:
            model.train() if phase == "train" else model.eval()

            running_loss, running_corrects = 0.0, 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(config["device"])
                labels = labels.to(config["device"])

                optimizer.zero_grad()
                with torch.set_grad_enabled(phase == "train"):
                    outputs = model(inputs)
                    loss    = criterion(outputs, labels)
                    preds   = outputs.argmax(dim=1)

                    if phase == "train":
                        loss.backward()
                        optimizer.step()

                running_loss     += loss.item() * inputs.size(0)
                running_corrects += (preds == labels).sum().item()

            epoch_loss = running_loss / len(dataloaders[phase].dataset)
            epoch_acc  = running_corrects / len(dataloaders[phase].dataset)
            history[f"{phase}_loss"].append(epoch_loss)
            history[f"{phase}_acc"].append(epoch_acc)

            if phase == "val":
                scheduler.step(epoch_loss)
                elapsed = time.time() - epoch_start
                print(f"| train_acc: {history['train_acc'][-1]:.4f}  "
                      f"val_acc: {epoch_acc:.4f}  "
                      f"val_loss: {epoch_loss:.4f}  "
                      f"[{elapsed:.1f}s]")

                if epoch_acc > best_val_acc:
                    best_val_acc   = epoch_acc
                    best_model_wts = copy.deepcopy(model.state_dict())
                    patience_count = 0
                    torch.save(model.state_dict(),
                               os.path.join(config["model_dir"], "best_model.pt"))
                    print(f"  ✅ Best model saved  (val_acc: {best_val_acc:.4f})")
                else:
                    patience_count += 1
                    if patience_count >= config["patience"]:
                        print(f"\n  ⏹  Early stopping triggered at epoch {epoch+1}")
                        model.load_state_dict(best_model_wts)
                        return model, history

    model.load_state_dict(best_model_wts)
    return model, history

if __name__ == '__main__':
    print("🚀 Starting training...\n")
    model, history = train_model(model, dataloaders, criterion, optimizer, scheduler, CONFIG)

    # evaluation block
    print("\n📊 Running final evaluation on validation set...")
    model.eval()
    all_preds, all_labels = [], []

    with torch.no_grad():
        for inputs, labels in dataloaders["val"]:
            inputs = inputs.to(CONFIG["device"])
            outputs = model(inputs)
            preds   = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())

    print("\n" + classification_report(all_labels, all_preds, target_names=class_names))

    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names)
    plt.title("Confusion Matrix — Validation Set")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    cm_path = os.path.join(CONFIG["model_dir"], "confusion_matrix.png")
    plt.savefig(cm_path)
    print(f"  ✅ Confusion matrix saved → {cm_path}")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(history["train_loss"], label="Train Loss")
    ax1.plot(history["val_loss"],   label="Val Loss")
    ax1.set_title("Loss"); ax1.legend()
    ax2.plot(history["train_acc"], label="Train Acc")
    ax2.plot(history["val_acc"],   label="Val Acc")
    ax2.set_title("Accuracy"); ax2.legend()
    plt.tight_layout()
    curves_path = os.path.join(CONFIG["model_dir"], "training_curves.png")
    plt.savefig(curves_path)
    print(f"  ✅ Training curves saved  → {curves_path}")

    with open(os.path.join(CONFIG["model_dir"], "training_history.json"), "w") as f:
        json.dump(history, f)

    print(f"\n{'='*50}")
    print(f"  ✅ TRAINING COMPLETE")
    print(f"  Best val accuracy : {max(history['val_acc']):.4f}")
    print(f"  Model saved at    : ml/models/best_model.pt")
    print(f"{'='*50}\n")
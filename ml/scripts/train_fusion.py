# ml/scripts/train_fusion.py
# ============================================================
#  Fusion Model
#  Combines image model + sensor model predictions
#  Uses late fusion — learns optimal weights for each branch
# ============================================================

import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import datasets, transforms, models
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

CONFIG = {
    "data_dir"   : "ml/data/processed",
    "sensor_path": "ml/data/sensor/sensor_labeled.csv",
    "model_dir"  : "ml/models",
    "batch_size" : 32,
    "num_epochs" : 30,
    "lr"         : 1e-3,
    "patience"   : 7,
    "img_size"   : 224,
    "device"     : "cuda" if torch.cuda.is_available() else "cpu"
}

FEATURES = ["pH", "TDS", "water_temp", "humidity", "dissolved_oxygen"]

print("="*50)
print("  Fusion Model — Training")
print("="*50)
print(f"  Device : {CONFIG['device'].upper()}\n")

# ──────────────────────────────────────────────
#  1. load pretrained image model (frozen)
# ──────────────────────────────────────────────
def build_image_model():
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, 2)
    )
    return model

image_model = build_image_model()
image_model.load_state_dict(torch.load(
    os.path.join(CONFIG["model_dir"], "best_model_finetuned.pt"),
    map_location=CONFIG["device"],
    weights_only=True
))
image_model = image_model.to(CONFIG["device"])
image_model.eval()
# freeze — we don't want to change it
for param in image_model.parameters():
    param.requires_grad = False
print("  ✅ Image model loaded + frozen")

# ──────────────────────────────────────────────
#  2. load pretrained sensor model (frozen)
# ──────────────────────────────────────────────
class SensorNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(5, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 2)
        )
    def forward(self, x):
        return self.net(x)

sensor_model = SensorNet().to(CONFIG["device"])
sensor_model.load_state_dict(torch.load(
    os.path.join(CONFIG["model_dir"], "sensor_model.pt"),
    map_location=CONFIG["device"],
    weights_only=True
))
sensor_model.eval()
for param in sensor_model.parameters():
    param.requires_grad = False
print("  ✅ Sensor model loaded + frozen")

scaler = joblib.load(os.path.join(CONFIG["model_dir"], "sensor_scaler.pkl"))
print("  ✅ Sensor scaler loaded\n")

# ──────────────────────────────────────────────
#  3. fusion head — learns weights for each branch
# ──────────────────────────────────────────────
class FusionHead(nn.Module):
    """
    Takes softmax probabilities from both models (4 values total)
    and learns the best way to combine them.
    input  : [img_p_healthy, img_p_diseased,
               sen_p_healthy, sen_p_diseased]  → 4 values
    output : [p_healthy, p_diseased]            → 2 values
    """
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(4, 16),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 2)
        )

    def forward(self, img_logits, sensor_logits):
        img_probs    = torch.softmax(img_logits, dim=1)
        sensor_probs = torch.softmax(sensor_logits, dim=1)
        combined     = torch.cat([img_probs, sensor_probs], dim=1)
        return self.net(combined)

fusion_head = FusionHead().to(CONFIG["device"])
print(f"  Fusion head params: "
      f"{sum(p.numel() for p in fusion_head.parameters()):,}")

# ──────────────────────────────────────────────
#  4. dataset — pairs image + sensor data
#  since we don't have perfectly paired data,
#  we match them by label (same class = valid pair)
# ──────────────────────────────────────────────
img_transform = transforms.Compose([
    transforms.Resize((CONFIG["img_size"], CONFIG["img_size"])),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# load image datasets
img_train = datasets.ImageFolder(
    os.path.join(CONFIG["data_dir"], "train"),
    transform=img_transform
)
img_val = datasets.ImageFolder(
    os.path.join(CONFIG["data_dir"], "val"),
    transform=img_transform
)

# class mapping from image dataset
# ImageFolder sorts alphabetically: diseased=0, healthy=1
img_class_to_idx = img_train.class_to_idx
print(f"\n  Image class mapping: {img_class_to_idx}")

# load sensor data
sensor_df = pd.read_csv(CONFIG["sensor_path"])
sensor_df_scaled = scaler.transform(sensor_df[FEATURES].values)

# separate sensor data by label
# note: image labels → diseased=0, healthy=1
# sensor labels     → healthy=0, diseased=1
# we align: both use diseased=0, healthy=1 for images
sensor_healthy  = sensor_df_scaled[sensor_df["label"] == 0]  # healthy
sensor_diseased = sensor_df_scaled[sensor_df["label"] == 1]  # diseased

class FusionDataset(Dataset):
    """
    For each image, pairs it with a randomly sampled
    sensor reading of the same class.
    This simulates having both modalities at inference time.
    """
    def __init__(self, img_dataset, sensor_healthy, sensor_diseased):
        self.img_dataset      = img_dataset
        self.sensor_healthy   = sensor_healthy
        self.sensor_diseased  = sensor_diseased
        # img label mapping: diseased=0, healthy=1
        self.diseased_idx     = img_class_to_idx["diseased"]  # 0
        self.healthy_idx      = img_class_to_idx["healthy"]   # 1

    def __len__(self):
        return len(self.img_dataset)

    def __getitem__(self, idx):
        img, label = self.img_dataset[idx]

        # pick random sensor row matching this label
        if label == self.healthy_idx:      # healthy
            i = np.random.randint(len(self.sensor_healthy))
            sensor = self.sensor_healthy[i]
        else:                              # diseased
            i = np.random.randint(len(self.sensor_diseased))
            sensor = self.sensor_diseased[i]

        sensor_tensor = torch.tensor(sensor, dtype=torch.float32)
        return img, sensor_tensor, label

train_ds = FusionDataset(img_train, sensor_healthy, sensor_diseased)
val_ds   = FusionDataset(img_val,   sensor_healthy, sensor_diseased)

train_loader = DataLoader(train_ds, batch_size=CONFIG["batch_size"],
                          shuffle=True,  num_workers=0)
val_loader   = DataLoader(val_ds,   batch_size=CONFIG["batch_size"],
                          shuffle=False, num_workers=0)

print(f"  Train pairs: {len(train_ds)}")
print(f"  Val pairs  : {len(val_ds)}\n")

# ──────────────────────────────────────────────
#  5. train only the fusion head
# ──────────────────────────────────────────────
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(fusion_head.parameters(),
                        lr=CONFIG["lr"], weight_decay=1e-4)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="min", factor=0.5, patience=3
)

best_val_acc   = 0.0
best_wts       = None
patience_count = 0
history        = {"train_loss": [], "val_loss": [],
                  "train_acc":  [], "val_acc":  []}

print("🚀 Training fusion head...\n")

for epoch in range(CONFIG["num_epochs"]):
    for phase, loader in [("train", train_loader), ("val", val_loader)]:
        fusion_head.train() if phase == "train" else fusion_head.eval()
        running_loss, correct = 0.0, 0

        for imgs, sensors, labels in loader:
            imgs    = imgs.to(CONFIG["device"])
            sensors = sensors.to(CONFIG["device"])
            labels  = labels.to(CONFIG["device"])

            optimizer.zero_grad()
            with torch.set_grad_enabled(phase == "train"):
                with torch.no_grad():
                    img_logits    = image_model(imgs)
                    sensor_logits = sensor_model(sensors)

                fusion_out = fusion_head(img_logits, sensor_logits)
                loss       = criterion(fusion_out, labels)

                if phase == "train":
                    loss.backward()
                    optimizer.step()

            running_loss += loss.item() * len(labels)
            correct      += (fusion_out.argmax(1) == labels).sum().item()

        epoch_loss = running_loss / len(loader.dataset)
        epoch_acc  = correct / len(loader.dataset)
        history[f"{phase}_loss"].append(epoch_loss)
        history[f"{phase}_acc"].append(epoch_acc)

        if phase == "val":
            scheduler.step(epoch_loss)
            print(f"Epoch {epoch+1:02d}/{CONFIG['num_epochs']}  "
                  f"| train_acc: {history['train_acc'][-1]:.4f}  "
                  f"val_acc: {epoch_acc:.4f}  "
                  f"val_loss: {epoch_loss:.4f}")

            if epoch_acc > best_val_acc:
                best_val_acc   = epoch_acc
                best_wts       = {k: v.clone()
                                  for k, v in fusion_head.state_dict().items()}
                patience_count = 0
                torch.save(fusion_head.state_dict(),
                           os.path.join(CONFIG["model_dir"],
                                        "fusion_head.pt"))
                print(f"  ✅ Best fusion model saved "
                      f"(val_acc: {best_val_acc:.4f})")
            else:
                patience_count += 1
                if patience_count >= CONFIG["patience"]:
                    print(f"\n  ⏹  Early stopping at epoch {epoch+1}")
                    break
    else:
        continue
    break

# ──────────────────────────────────────────────
#  6. final evaluation
# ──────────────────────────────────────────────
fusion_head.load_state_dict(best_wts)
fusion_head.eval()
all_preds, all_labels = [], []

with torch.no_grad():
    for imgs, sensors, labels in val_loader:
        imgs    = imgs.to(CONFIG["device"])
        sensors = sensors.to(CONFIG["device"])
        img_logits    = image_model(imgs)
        sensor_logits = sensor_model(sensors)
        out = fusion_head(img_logits, sensor_logits)
        all_preds.extend(out.argmax(1).cpu().numpy())
        all_labels.extend(labels.numpy())

class_names = list(img_class_to_idx.keys())
print("\n" + classification_report(
    all_labels, all_preds, target_names=class_names
))

cm = confusion_matrix(all_labels, all_preds)
plt.figure(figsize=(5, 4))
sns.heatmap(cm, annot=True, fmt="d", cmap="Purples",
            xticklabels=class_names, yticklabels=class_names)
plt.title("Fusion Model — Confusion Matrix")
plt.ylabel("Actual"); plt.xlabel("Predicted")
plt.tight_layout()
plt.savefig(os.path.join(CONFIG["model_dir"], "fusion_confusion_matrix.png"))

with open(os.path.join(CONFIG["model_dir"], "fusion_history.json"), "w") as f:
    json.dump(history, f)

# save fusion config for backend
fusion_config = {
    "image_model"  : "best_model_finetuned.pt",
    "sensor_model" : "sensor_model.pt",
    "fusion_head"  : "fusion_head.pt",
    "sensor_scaler": "sensor_scaler.pkl",
    "features"     : FEATURES,
    "classes"      : class_names,
    "class_to_idx" : img_class_to_idx
}
with open(os.path.join(CONFIG["model_dir"], "fusion_config.json"), "w") as f:
    json.dump(fusion_config, f)

print(f"\n{'='*50}")
print(f"  ✅ FUSION MODEL COMPLETE")
print(f"  Best val accuracy  : {best_val_acc:.4f}")
print(f"  Image model alone  : 0.8931")
print(f"  Fusion model       : {best_val_acc:.4f}")
print(f"  Improvement        : +{(best_val_acc - 0.8931):.4f}")
print(f"  Saved: ml/models/fusion_head.pt")
print(f"{'='*50}\n")
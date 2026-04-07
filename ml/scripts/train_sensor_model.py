# ml/scripts/train_sensor_model.py
# ============================================================
#  Sensor-only Model
#  Simple feedforward neural net on 5 sensor features
#  Input : pH, TDS, water_temp, humidity, dissolved_oxygen
#  Output: healthy (0) or diseased (1)
# ============================================================

import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

CONFIG = {
    "data_path"  : "ml/data/sensor/sensor_labeled.csv",
    "model_dir"  : "ml/models",
    "batch_size" : 64,
    "num_epochs" : 50,
    "lr"         : 1e-3,
    "patience"   : 8,
    "val_split"  : 0.2,
    "device"     : "cuda" if torch.cuda.is_available() else "cpu"
}

FEATURES = ["pH", "TDS", "water_temp", "humidity", "dissolved_oxygen"]

print("="*50)
print("  Sensor Model — Training")
print("="*50)
print(f"  Device : {CONFIG['device'].upper()}")

# ── dataset class ──
class SensorDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.long)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

# ── load and preprocess ──
df = pd.read_csv(CONFIG["data_path"])
X  = df[FEATURES].values
y  = df["label"].values

# scale features — very important for neural nets
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# save scaler — backend needs this to scale incoming sensor data
os.makedirs(CONFIG["model_dir"], exist_ok=True)
joblib.dump(scaler, os.path.join(CONFIG["model_dir"], "sensor_scaler.pkl"))
print(f"\n  ✅ Scaler saved → ml/models/sensor_scaler.pkl")

# train/val split
dataset  = SensorDataset(X_scaled, y)
val_size = int(len(dataset) * CONFIG["val_split"])
trn_size = len(dataset) - val_size
train_ds, val_ds = random_split(
    dataset, [trn_size, val_size],
    generator=torch.Generator().manual_seed(42)
)

train_loader = DataLoader(train_ds, batch_size=CONFIG["batch_size"], shuffle=True)
val_loader   = DataLoader(val_ds,   batch_size=CONFIG["batch_size"], shuffle=False)

print(f"  Train samples : {trn_size}")
print(f"  Val samples   : {val_size}\n")

# ── model architecture ──
# simple but effective for tabular data
# input(5) → 64 → 32 → 16 → output(2)
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

model     = SensorNet().to(CONFIG["device"])
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(),
                        lr=CONFIG["lr"], weight_decay=1e-4)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="min", factor=0.5, patience=4
)

total_params = sum(p.numel() for p in model.parameters())
print(f"  Model params: {total_params:,}")

# ── training loop ──
best_val_acc   = 0.0
best_wts       = None
patience_count = 0
history        = {"train_loss": [], "val_loss": [],
                  "train_acc":  [], "val_acc":  []}

print("\n🚀 Training sensor model...\n")

for epoch in range(CONFIG["num_epochs"]):
    for phase, loader in [("train", train_loader), ("val", val_loader)]:
        model.train() if phase == "train" else model.eval()
        running_loss, correct = 0.0, 0

        for X_batch, y_batch in loader:
            X_batch = X_batch.to(CONFIG["device"])
            y_batch = y_batch.to(CONFIG["device"])
            optimizer.zero_grad()

            with torch.set_grad_enabled(phase == "train"):
                out  = model(X_batch)
                loss = criterion(out, y_batch)
                if phase == "train":
                    loss.backward()
                    optimizer.step()

            running_loss += loss.item() * len(y_batch)
            correct      += (out.argmax(1) == y_batch).sum().item()

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
                best_val_acc = epoch_acc
                best_wts     = {k: v.clone()
                                for k, v in model.state_dict().items()}
                patience_count = 0
                torch.save(model.state_dict(),
                           os.path.join(CONFIG["model_dir"],
                                        "sensor_model.pt"))
                print(f"  ✅ Best sensor model saved (val_acc: {best_val_acc:.4f})")
            else:
                patience_count += 1
                if patience_count >= CONFIG["patience"]:
                    print(f"\n  ⏹  Early stopping at epoch {epoch+1}")
                    break
    else:
        continue
    break

# ── final evaluation ──
model.load_state_dict(best_wts)
model.eval()
all_preds, all_labels = [], []

with torch.no_grad():
    for X_batch, y_batch in val_loader:
        X_batch = X_batch.to(CONFIG["device"])
        out     = model(X_batch)
        all_preds.extend(out.argmax(1).cpu().numpy())
        all_labels.extend(y_batch.numpy())

print("\n" + classification_report(
    all_labels, all_preds,
    target_names=["healthy", "diseased"]
))

cm = confusion_matrix(all_labels, all_preds)
plt.figure(figsize=(5, 4))
sns.heatmap(cm, annot=True, fmt="d", cmap="Greens",
            xticklabels=["healthy", "diseased"],
            yticklabels=["healthy", "diseased"])
plt.title("Sensor Model — Confusion Matrix")
plt.ylabel("Actual"); plt.xlabel("Predicted")
plt.tight_layout()
plt.savefig(os.path.join(CONFIG["model_dir"], "sensor_confusion_matrix.png"))

with open(os.path.join(CONFIG["model_dir"], "sensor_history.json"), "w") as f:
    json.dump(history, f)

# save model config for backend
model_config = {
    "features"   : FEATURES,
    "n_features" : len(FEATURES),
    "n_classes"  : 2,
    "classes"    : ["healthy", "diseased"]
}
with open(os.path.join(CONFIG["model_dir"], "sensor_config.json"), "w") as f:
    json.dump(model_config, f)

print(f"\n{'='*50}")
print(f"  ✅ SENSOR MODEL TRAINING COMPLETE")
print(f"  Best val accuracy : {best_val_acc:.4f}")
print(f"  Model saved       : ml/models/sensor_model.pt")
print(f"  Scaler saved      : ml/models/sensor_scaler.pkl")
print(f"  Config saved      : ml/models/sensor_config.json")
print(f"{'='*50}\n")
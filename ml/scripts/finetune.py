# ml/scripts/finetune_v2.py
# ============================================================
#  Stage 3 — Discriminative Fine-tuning
#  Unfreeze ALL layers with different LR per layer group
#  + stronger regularization to fight overfitting
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

CONFIG = {
    "data_dir"    : "ml/data/processed",
    "model_dir"   : "ml/models",
    "batch_size"  : 24,           # slightly smaller — more stable gradients
    "num_epochs"  : 25,
    "img_size"    : 224,
    "num_classes" : 2,
    "patience"    : 7,            # more patience this time
    "device"      : "cuda" if torch.cuda.is_available() else "cpu"
}

print(f"\n{'='*50}")
print(f"  ROOT HEALTH MONITOR — Discriminative Fine-tuning")
print(f"{'='*50}")
print(f"  Device : {CONFIG['device'].upper()}")
print(f"  Strategy: different LR per layer group")
print(f"{'='*50}\n")

# stronger augmentation to fight overfitting
data_transforms = {
    "train": transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),              # random crop instead of resize
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(15),           # slight rotation
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.RandomGrayscale(p=0.05),      # occasionally grayscale
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.1)          # randomly erase small patches
    ]),
    "val": transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
}

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
        num_workers=0,
        pin_memory=True
    )
    for split in ["train", "val"]
}

class_names = image_datasets["train"].classes

# ── load finetuned model from stage 2 ──
def build_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),           # stronger dropout vs 0.3 before
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.3),           # stronger dropout vs 0.2 before
        nn.Linear(256, num_classes)
    )
    return model

model = build_model(CONFIG["num_classes"])
checkpoint_path = os.path.join(CONFIG["model_dir"], "best_model_finetuned.pt")
model.load_state_dict(torch.load(checkpoint_path,
                                  map_location=CONFIG["device"],
                                  weights_only=True))
model = model.to(CONFIG["device"])
print(f"  ✅ Loaded checkpoint: {checkpoint_path}")

# ── unfreeze ALL layers ──
for param in model.parameters():
    param.requires_grad = True

total = sum(p.numel() for p in model.parameters())
print(f"  Total trainable params: {total:,} (all layers unfrozen)\n")

# ── discriminative LRs — different rate per layer group ──
# early layers learn basic features — barely touch them
# later layers learn complex patterns — update more freely
early_layers  = list(model.features[:4].parameters())   # blocks 0-3
middle_layers = list(model.features[4:7].parameters())  # blocks 4-6
late_layers   = list(model.features[7:].parameters())   # block 7 + head
classifier    = list(model.classifier.parameters())

optimizer = optim.AdamW([
    {"params": early_layers,  "lr": 1e-6},   # barely move
    {"params": middle_layers, "lr": 5e-6},   # move a little
    {"params": late_layers,   "lr": 1e-5},   # move normally
    {"params": classifier,    "lr": 1e-5},   # move normally
], weight_decay=1e-3)                         # stronger weight decay

scheduler = optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=CONFIG["num_epochs"],   # cosine decay over all epochs
    eta_min=1e-7
)

# class weights
train_counts = [len(os.listdir(os.path.join(CONFIG["data_dir"], "train", c)))
                for c in class_names]
total_imgs = sum(train_counts)
weights = torch.tensor(
    [total_imgs / (CONFIG["num_classes"] * c) for c in train_counts],
    dtype=torch.float
).to(CONFIG["device"])
criterion = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)
# label_smoothing stops model being overconfident — helps generalization

def train_model(model, dataloaders, criterion, optimizer, scheduler, config):
    best_model_wts = copy.deepcopy(model.state_dict())
    best_val_acc   = 0.0
    patience_count = 0
    history        = {"train_loss": [], "val_loss": [],
                      "train_acc": [], "val_acc": []}

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
                scheduler.step()
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
                               os.path.join(config["model_dir"],
                                            "best_model_v2.pt"))
                    print(f"  ✅ Best model saved (val_acc: {best_val_acc:.4f})")
                else:
                    patience_count += 1
                    if patience_count >= config["patience"]:
                        print(f"\n  ⏹  Early stopping at epoch {epoch+1}")
                        model.load_state_dict(best_model_wts)
                        return model, history

    model.load_state_dict(best_model_wts)
    return model, history

if __name__ == '__main__':
    print("🚀 Starting discriminative fine-tuning...\n")
    model, history = train_model(
        model, dataloaders, criterion, optimizer, scheduler, CONFIG
    )

    print("\n📊 Final evaluation...")
    model.eval()
    all_preds, all_labels = [], []

    with torch.no_grad():
        for inputs, labels in dataloaders["val"]:
            inputs  = inputs.to(CONFIG["device"])
            outputs = model(inputs)
            preds   = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())

    print("\n" + classification_report(
        all_labels, all_preds, target_names=class_names
    ))

    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names)
    plt.title("Confusion Matrix — v2 Model")
    plt.ylabel("Actual"); plt.xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG["model_dir"], "confusion_matrix_v2.png"))

    with open(os.path.join(CONFIG["model_dir"], "history_v2.json"), "w") as f:
        json.dump(history, f)

    print(f"\n{'='*50}")
    print(f"  ✅ COMPLETE")
    print(f"  Best val accuracy : {max(history['val_acc']):.4f}")
    print(f"  Model saved at    : ml/models/best_model_v2.pt")
    print(f"{'='*50}\n")
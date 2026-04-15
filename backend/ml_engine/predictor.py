# backend/ml_engine/predictor.py

import torch
import torch.nn as nn
import numpy as np
import joblib
import json
import io
import base64
import cv2
from torchvision import transforms, models
from PIL import Image
from core.config import settings
from core.logging_config import get_logger

logger = get_logger(__name__)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

IMG_TRANSFORM = transforms.Compose([
    transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ── model architectures (must match training exactly) ──
def build_image_model():
    model = models.efficientnet_b0(weights=None)
    in_f  = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_f, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, 2)
    )
    return model

class SensorNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(5, 64), nn.BatchNorm1d(64),
            nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(64, 32), nn.BatchNorm1d(32),
            nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 16), nn.ReLU(),
            nn.Linear(16, 2)
        )
    def forward(self, x):
        return self.net(x)

class FusionHead(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(4, 16), nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(16, 8), nn.ReLU(),
            nn.Linear(8, 2)
        )
    def forward(self, img_logits, sensor_logits):
        img_p    = torch.softmax(img_logits, dim=1)
        sensor_p = torch.softmax(sensor_logits, dim=1)
        return self.net(torch.cat([img_p, sensor_p], dim=1))


# ── Grad-CAM implementation ──────────────────────────────────────────────────
class GradCAM:
    """
    Grad-CAM for EfficientNet-B0.
    Hooks onto the last conv block (features[-1]) to produce a spatial
    heatmap showing which image regions drove the prediction.
    """
    def __init__(self, model: nn.Module):
        self.model      = model
        self.gradients  = None
        self.activations = None

        # EfficientNet-B0: last conv block is model.features[-1]
        target_layer = model.features[-1]

        self._fwd_hook = target_layer.register_forward_hook(self._save_activation)
        self._bwd_hook = target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """
        Returns a float32 numpy array [0,1] of shape (H, W) — the CAM heatmap.
        """
        self.model.zero_grad()

        # Forward (with grad enabled this time)
        logits = self.model(tensor)
        score  = logits[0, class_idx]
        score.backward()

        # Global average pool the gradients → channel weights
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)  # (1, C, 1, 1)
        cam     = (weights * self.activations).sum(dim=1).squeeze()  # (H, W)
        cam     = torch.relu(cam).cpu().numpy()

        # Normalize to [0, 1]
        if cam.max() > 0:
            cam = cam / cam.max()
        return cam

    def remove_hooks(self):
        self._fwd_hook.remove()
        self._bwd_hook.remove()


def _overlay_heatmap(
    original_bytes: bytes,
    cam: np.ndarray,
    alpha: float = 0.45,
    colormap: int = cv2.COLORMAP_JET,
) -> str:
    """
    Blend a Grad-CAM heatmap onto the original image.
    Returns a base64-encoded PNG string (data URI ready).
    """
    # Decode original to BGR numpy
    nparr   = np.frombuffer(original_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        # Fallback: use PIL to decode (handles WEBP etc.)
        pil_img = Image.open(io.BytesIO(original_bytes)).convert("RGB")
        img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    h, w = img_bgr.shape[:2]

    # Resize CAM to original image size
    cam_uint8  = (cam * 255).astype(np.uint8)
    cam_resized = cv2.resize(cam_uint8, (w, h), interpolation=cv2.INTER_CUBIC)

    # Apply colormap and blend
    heatmap = cv2.applyColorMap(cam_resized, colormap)
    blended = cv2.addWeighted(img_bgr, 1 - alpha, heatmap, alpha, 0)

    # Encode to PNG → base64
    _, buf = cv2.imencode(".png", blended)
    return "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("utf-8")


def _sensor_attribution(sensor: dict, sensor_probs: torch.Tensor, class_to_idx: dict) -> list[dict]:
    """
    Simple sensitivity-based attribution for sensor inputs.
    Returns a list of {name, value, unit, impact, direction} dicts
    sorted by absolute impact descending.
    """
    SENSOR_META = {
        "ph":                     {"label": "pH",                       "unit": "",       "healthy_range": (5.5, 7.0)},
        "tds":                    {"label": "TDS",                      "unit": "ppm",    "healthy_range": (500, 1500)},
        "water_temp":             {"label": "Water Temperature",        "unit": "°C",     "healthy_range": (18, 24)},
        "humidity":               {"label": "Humidity",                 "unit": "%",      "healthy_range": (50, 80)},
        "dissolved_oxygen":       {"label": "Dissolved Oxygen",         "unit": "mg/L",   "healthy_range": (6, 10)},
    }

    diseased_prob = sensor_probs[class_to_idx["diseased"]].item()
    attributions  = []

    for key, meta in SENSOR_META.items():
        if key not in sensor:
            continue
        val   = sensor[key]
        lo, hi = meta["healthy_range"]
        if val < lo:
            deviation = (lo - val) / (lo - 0 + 1e-6)
            direction = "low"
        elif val > hi:
            deviation = (val - hi) / (hi * 0.5 + 1e-6)
            direction = "high"
        else:
            deviation = 0.0
            direction = "normal"

        attributions.append({
            "key":       key,
            "label":     meta["label"],
            "value":     round(val, 3),
            "unit":      meta["unit"],
            "direction": direction,
            "deviation": round(min(deviation, 1.0), 3),
            "range_lo":  lo,
            "range_hi":  hi,
        })

    # Sort by deviation descending
    attributions.sort(key=lambda x: x["deviation"], reverse=True)
    return attributions


# ── main predictor class ─────────────────────────────────────────────────────
class RootHealthPredictor:
    def __init__(self):
        logger.info(f"Loading models on {DEVICE.upper()}...")
        md = settings.MODEL_DIR

        with open(md / settings.FUSION_CONFIG) as f:
            cfg = json.load(f)
        self.class_to_idx = cfg["class_to_idx"]
        self.idx_to_class = {v: k for k, v in self.class_to_idx.items()}
        self.sensor_class_to_idx = {"healthy": 0, "diseased": 1}

        self.image_model = build_image_model()
        self.image_model.load_state_dict(torch.load(
            md / settings.IMAGE_MODEL,
            map_location=DEVICE, weights_only=True
        ))
        self.image_model.to(DEVICE).eval()

        self.sensor_model = SensorNet()
        self.sensor_model.load_state_dict(torch.load(
            md / settings.SENSOR_MODEL,
            map_location=DEVICE, weights_only=True
        ))
        self.sensor_model.to(DEVICE).eval()

        self.fusion_head = FusionHead()
        self.fusion_head.load_state_dict(torch.load(
            md / settings.FUSION_HEAD,
            map_location=DEVICE, weights_only=True
        ))
        self.fusion_head.to(DEVICE).eval()

        self.scaler = joblib.load(md / settings.SENSOR_SCALER)
        logger.info("All models loaded ✅")

    def _load_image(self, image_bytes: bytes) -> torch.Tensor:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return IMG_TRANSFORM(img).unsqueeze(0).to(DEVICE)

    def _parse_probs(self, probs: torch.Tensor) -> dict:
        d_idx    = self.class_to_idx["diseased"]
        h_idx    = self.class_to_idx["healthy"]
        pred_idx = probs.argmax().item()
        return {
            "prediction"   : self.idx_to_class[pred_idx],
            "confidence"   : round(probs[pred_idx].item(), 4),
            "probabilities": {
                "healthy" : round(probs[h_idx].item(), 4),
                "diseased": round(probs[d_idx].item(), 4)
            }
        }

    def _run_gradcam(self, image_bytes: bytes, class_idx: int) -> str | None:
        """
        Run Grad-CAM on the image model for the given class index.
        Returns base64 PNG overlay string, or None on failure.
        """
        try:
            # Re-run forward+backward with grad — needs a fresh tensor
            tensor  = self._load_image(image_bytes).requires_grad_(False)
            gradcam = GradCAM(self.image_model)

            # Switch model to train mode temporarily (needed for gradients through BN)
            self.image_model.train()
            tensor  = self._load_image(image_bytes)
            cam     = gradcam.generate(tensor, class_idx)
            self.image_model.eval()

            gradcam.remove_hooks()
            overlay = _overlay_heatmap(image_bytes, cam)
            return overlay
        except Exception as e:
            logger.warning(f"Grad-CAM failed: {e}")
            return None

    def predict_image_only(self, image_bytes: bytes) -> dict:
        tensor = self._load_image(image_bytes)
        with torch.no_grad():
            logits = self.image_model(tensor)
            probs  = torch.softmax(logits, dim=1)[0]

        result              = self._parse_probs(probs)
        pred_class_idx      = self.class_to_idx[result["prediction"]]
        result["image_score"]        = round(probs[self.class_to_idx["diseased"]].item(), 4)
        result["sensor_score"]       = None
        result["mode"]               = "image_only"
        result["gradcam_overlay"]    = self._run_gradcam(image_bytes, pred_class_idx)
        result["sensor_attributions"] = None

        logger.info(f"Image-only → {result['prediction']} ({result['confidence']:.2%})")
        return result

    def predict_fusion(self, image_bytes: bytes, sensor: dict) -> dict:
        tensor = self._load_image(image_bytes)

        sensor_arr = np.array([[
            sensor["ph"], sensor["tds"], sensor["water_temp"],
            sensor["humidity"], sensor["dissolved_oxygen"]
        ]])
        sensor_scaled  = self.scaler.transform(sensor_arr)
        sensor_tensor  = torch.tensor(sensor_scaled, dtype=torch.float32).to(DEVICE)

        with torch.no_grad():
            img_logits    = self.image_model(tensor)
            sensor_logits = self.sensor_model(sensor_tensor)

            img_probs    = torch.softmax(img_logits, dim=1)[0]
            sensor_probs = torch.softmax(sensor_logits, dim=1)[0]

        # simple weighted average — 60% image, 40% sensor
        d_idx = self.class_to_idx["diseased"]
        h_idx = self.class_to_idx["healthy"]

        # image model uses class_to_idx, sensor model uses sensor_class_to_idx
        s_d_idx = self.sensor_class_to_idx["diseased"]
        s_h_idx = self.sensor_class_to_idx["healthy"]

        diseased_score = (img_probs[d_idx].item() * 0.6) + (sensor_probs[s_d_idx].item() * 0.4)
        healthy_score  = (img_probs[h_idx].item() * 0.6) + (sensor_probs[s_h_idx].item() * 0.4)
        prediction = "diseased" if diseased_score > healthy_score else "healthy"
        confidence = round(max(diseased_score, healthy_score), 4)

        fusion_result = {
            "prediction": prediction,
            "confidence": confidence,
            "probabilities": {
                "healthy":  round(healthy_score, 4),
                "diseased": round(diseased_score, 4),
            }
        }

        d_idx  = self.class_to_idx["diseased"]
        result = fusion_result
        pred_class_idx = self.class_to_idx[result["prediction"]]

        result["image_score"]         = round(img_probs[d_idx].item(), 4)
        result["sensor_score"] = round(sensor_probs[s_d_idx].item(), 4)
        result["mode"]                = "fusion"
        result["gradcam_overlay"]     = self._run_gradcam(image_bytes, pred_class_idx)
        result["sensor_attributions"] = _sensor_attribution(sensor, sensor_probs, self.sensor_class_to_idx)

        logger.info(
            f"Fusion → {result['prediction']} ({result['confidence']:.2%}) | "
            f"img={result['image_score']:.2f} sensor={result['sensor_score']:.2f}"
        )
        return result
    
    def predict_sensor_only(self, sensor: dict) -> dict:
        sensor_arr = np.array([[
            sensor["ph"], sensor["tds"], sensor["water_temp"],
            sensor["humidity"], sensor["dissolved_oxygen"]
        ]])
        sensor_scaled = self.scaler.transform(sensor_arr)
        sensor_tensor = torch.tensor(sensor_scaled, dtype=torch.float32).to(DEVICE)

        with torch.no_grad():
            sensor_logits = self.sensor_model(sensor_tensor)
            sensor_probs  = torch.softmax(sensor_logits, dim=1)[0]

        # use sensor-specific indices for parsing
        d_idx = self.sensor_class_to_idx["diseased"]
        h_idx = self.sensor_class_to_idx["healthy"]
        pred_idx = sensor_probs.argmax().item()
        result = {
            "prediction": "diseased" if pred_idx == d_idx else "healthy",
            "confidence": round(sensor_probs[pred_idx].item(), 4),
            "probabilities": {
                "healthy":  round(sensor_probs[h_idx].item(), 4),
                "diseased": round(sensor_probs[d_idx].item(), 4),
            }
        }
        result["image_score"]         = None
        result["sensor_score"] = round(sensor_probs[self.sensor_class_to_idx["diseased"]].item(), 4)
        result["mode"]                = "sensor_only"
        result["gradcam_overlay"]     = None
        result["sensor_attributions"] = _sensor_attribution(sensor, sensor_probs, self.sensor_class_to_idx)

        logger.info(f"Sensor-only → {result['prediction']} ({result['confidence']:.2%})")
        return result


# loaded once when backend starts — reused for every request
predictor = RootHealthPredictor()
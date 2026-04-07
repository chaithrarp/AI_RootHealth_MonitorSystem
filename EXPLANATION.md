# Root Health Monitor — Complete System Explanation

## 📋 Table of Contents
1. [How the System Works (Overview)](#overview)
2. [Root Classification Logic](#root-classification)
3. [Why Healthy Roots Can Have Browning](#why-browning)
4. [Sensor Data Explained](#sensor-data)
5. [Frontend & Backend Communication](#communication)
6. [Score Visualization](#scores)

---

## Overview

The **Root Health Monitor** is an AI system that analyzes root images to predict if they're **healthy** or **diseased**. It has two modes:

1. **Image-Only Mode**: Just looks at the root photo
2. **Fusion Mode**: Combines image analysis + sensor readings for a more accurate prediction

Think of it like a doctor who can:
- Look at your X-ray (image) to spot problems
- OR check your blood pressure, temperature, and other vitals (sensors) PLUS your X-ray for a complete diagnosis

---

## Root Classification Logic

### The Core Question
**"Is this root healthy or diseased?"**

This is a **binary classification** problem: The AI answers YES (healthy) or NO (diseased).

### How It Works in 3 Steps

#### Step 1: The Training Phase (What Happened Before)
- 🗂️ **Dataset**: ~650 root images from the LettuCeV dataset
- 🏷️ **Labels**: Each image was labeled as:
  - **Diseased** (class 1) = roots with browning, slime coating, necrosis, soft rot
  - **Healthy** (class 2) = white/cream colored, clean structure, no visible lesions
- 🤖 **Model**: EfficientNet-B0 (a pre-trained deep learning model)
- 🔄 **Augmentation**: Each training image was multiplied 8x with random flips, rotations, and color changes
- 💾 **Result**: A trained neural network saved as `ml/models/best_model.pt`

#### Step 2: What the Model Learned
The model learned **visual features** that distinguish healthy from diseased roots:

| Feature | Healthy Roots | Diseased Roots |
|---------|--------------|----------------|
| **Color** | Bright white to cream | Brown, dark, mottled |
| **Surface** | Smooth, intact | Slimy, coated, rough |
| **Root Tips** | Sharp, well-defined | Blunt, discolored, necrotic |
| **Consistency** | Firm appearance | Soft/mushy appearance |

#### Step 3: Prediction Time (What Happens Now)
When you upload an image:
1. Backend receives the image
2. Image is resized to **224×224 pixels**
3. Pre-processing: normalized using ImageNet standard values
4. Passes through EfficientNet model
5. **Output**: Two probability scores
   - Score for "diseased" (0-1)
   - Score for "healthy" (0-1)
   - These always sum to 1.0

**Example**:
```
Input: Root image
↓
Model processes it
↓
Output: 
  - Healthy probability: 0.85
  - Diseased probability: 0.15
↓
Decision: HEALTHY (take the higher score)
Confidence: 85%
```

---

## Why Browning?

### The Key Insight
**"Not all browning = disease"**

This is the most important thing to understand!

### Browning on Healthy Roots

Healthy roots CAN have some browning for natural reasons:

1. **Maturity**
   - Young roots: White
   - Mature roots: Light tan/brown is NORMAL
   - Very old roots: Darker brown is expected

2. **Natural Aging**
   - Root tips naturally accumulate pigments as they age
   - This is like how skin tans in the sun — it's protective, not harmful

3. **Aerial Roots**
   - Roots exposed to air (not fully submerged) often develop pigmentation
   - This is natural in hydroponics; doesn't mean disease

4. **Varietal Differences**
   - Some root varieties are naturally darker
   - Just like apple varieties have different skin colors

### Browning on Diseased Roots

Diseased roots show **pathological** browning:
- **Black/dark necrotic lesions** (dead tissue)
- **Slimy coating** around the browning
- **Soft, mushy texture** (visible as deformation)
- **Rapid spread** from tips inward
- **Accompanied by secondary symptoms** like root rot smell

### The Model Learned the Difference

From 650+ images, the model learned:

```
✅ "Brown is OK if:"
   - It's gradual from tip to base
   - Root maintains firm structure
   - No slime or soft spots
   - No rapid tissue breakdown

❌ "Brown indicates disease if:"
   - Sudden dark discoloration (necrosis)
   - Accompanied by slime/viscosity
   - Root appears soft/mushy
   - Multiple roots affected rapidly
```

### Real Example

```
Root A: Cream base → Light tan tip
Status: HEALTHY ✅
(This is normal maturation)

Root B: White base → Sudden dark brown lesion → Slimy surface
Status: DISEASED ❌
(This is pathological)

The model distinguishes between these!
```

---

## Sensor Data Explained

### The 5 Sensor Values

When you toggle "Enable Sensor Data" in the frontend, you can adjust 5 sliders:

| Sensor | Unit | Range | Healthy Window | What It Measures |
|--------|------|-------|-----------------|-----------------|
| **pH** | - | 0-14 | **5.5-7.0** | Acidity/alkalinity of water |
| **TDS** | ppm | 0-5000 | **500-1500** | Total dissolved solids (nutrients) |
| **Water Temp** | °C | 0-40 | **18-24** | Hydroponic system temperature |
| **Humidity** | % | 0-100 | **50-80** | Air moisture around plants |
| **Dissolved Oxygen** | mg/L | 0-20 | **6-10** | Oxygen in the water (critical!) |

### Are These Hardcoded? YES — With a Reason

The **default/demo values ARE hardcoded** here:

```typescript
// frontend/src/components/SensorSliders.tsx
export const DEFAULT_SENSORS: SensorInput = {
  ph:                      6.5,      // Optimal
  tds:                     1000,     // Mid-range nutrients
  dissolved_oxygen:        8,        // Healthy
  water_temp:              22,       // Room temp
  humidity:                60,       // Good range
}
```

**Why are they hardcoded?**
- 🎯 These represent **typical healthy hydroponics**
- 📊 They're based on industry standards
- 🧪 The ML model was trained with similar conditions
- 🎮 Users can **adjust them all with sliders** to see how the prediction changes

**They're NOT real sensor readings** — they're:
- ✅ Demo values for testing
- ✅ Showing what "optimal" looks like
- ✅ Educational (teach users about ranges)
- ❌ NOT connected to real IoT sensors (yet)

### How Sensor Data Affects the Prediction

When you **DON'T** provide sensors:
```
Image → Image Model → Decision
Example: "90% diseased"
Mode: "image_only"
```

When you **DO** provide sensors:
```
Image → Image Model → 70% diseased
↓ PLUS ↓
Sensors → Sensor Model → 60% diseased
↓ COMBINED BY ↓
Fusion Head → Final Decision: 65% diseased
Mode: "fusion"
```

### What the Sensor Model Learns

The sensor model is a small neural network trained to predict:
- "Based on ONLY these 5 numbers (pH, TDS, etc.), is the root environment diseased?"

It learns patterns like:
```
❌ BAD combinations:
   - pH too high (>7.5) + High temperature + Low dissolved oxygen
     → Conditions favor Pythium
   
   - pH too low (<5) + High TDS + Low humidity
     → Stress conditions favor fungal infection

✅ GOOD combinations:
   - pH 5.5-7.0 + Moderate TDS + High dissolved oxygen
     → Optimal hydroponics environment
```

### Sensor Attribution (The Breakdown)

After a fusion prediction, you see which sensors mattered most:

```
Prediction: DISEASED (68%)

Sensor Breakdown:
1. Dissolved Oxygen: 3.2 mg/L (CRITICAL - Low range) ⚠️
   Direction: LOW
   Deviation: 0.68 (68% outside healthy range)
   
2. pH: 8.2 (High) ⚠️
   Direction: HIGH
   Deviation: 0.32 (32% outside healthy range)
   
3. Temperature: 26°C (Normal-High)
   Direction: HIGH
   Deviation: 0.15 (acceptable)
```

This tells you: **"Your DO level is critically low — that's the main problem!"**

---

## Frontend & Backend Communication

### The Flow

#### Step 1: User Uploads Image + Optionally Adds Sensors

**Frontend (React)**
```
User Interface
    ↓
Choose image (drag & drop or browse)
    ↓
(Optional) Toggle "Enable Sensor Data" 
    ↓
(Optional) Adjust 5 sliders for sensor values
    ↓
Click "Analyze"
```

#### Step 2: Frontend Sends to Backend

**Frontend Code** (`frontend/src/hooks/usePrediction.ts`):
```javascript
const data = await predict(image, sensorsPayload)
```

This calls:
```javascript
// frontend/src/api/api.ts
POST /api/v1/predict
Headers: multipart/form-data
Body:
{
  image: <binary image data>,
  sensor_data: '{"ph": 6.5, "tds": 1000, "water_temp": 22, ...}'  // JSON string
}
```

#### Step 3: Backend Processes

**Backend Routes** (`backend/api/v1/predict.py`):
```python
@router.post("/predict")
async def predict(
    image: UploadFile,              # The image file
    sensor_data: Optional[str],     # JSON string of sensors
    db: Session                     # Database connection
):
```

Then calls **PredictionService**:

**Backend Service** (`backend/services/prediction_service.py`):
1. Validates the image
   - Check file type (JPG, PNG allowed)
   - Check file size (max 25MB)
   - Check not empty

2. Parses sensor data (if provided)
   - Deserialize JSON string
   - Validate ranges (using Pydantic schemas)
   - Example validation: pH must be 3-10 (hydroponic range)

3. Runs prediction via ML Engine
   ```python
   if sensor_json:
       result = predictor.predict_fusion(image_bytes, sensor.dict())
   else:
       result = predictor.predict_image_only(image_bytes)
   ```

#### Step 4: ML Engine Processes

**Predictor** (`backend/ml_engine/predictor.py`):

**Image-Only Path**:
```
Image bytes
    ↓
Resize to 224×224
    ↓
Normalize (using ImageNet stats)
    ↓
Feed to EfficientNet model
    ↓
Get logits [diseased_score, healthy_score]
    ↓
Convert to probabilities (softmax)
    ↓
Return: {
  prediction: "healthy" or "diseased",
  confidence: 0.92,
  image_score: 0.92,  // Diseased probability
  sensor_score: null,
  gradcam_overlay: "<image heatmap>"
}
```

**Fusion Path**:
```
Image + Sensors
    ↓
Image path:
  Image → EfficientNet → logits_image
    
Sensor path:
  [pH, TDS, Temp, Humidity, DO] → Scale → SensorNet → logits_sensor
    
Fusion:
  logits_image + logits_sensor → FusionHead → logits_fusion
    ↓
Probabilities from logits_fusion
    ↓
Return: {
  prediction: final decision,
  confidence: combined confidence,
  image_score: 0.70,     // What image said
  sensor_score: 0.60,    // What sensors said
  sensor_attributions: [  // Which sensors mattered
    {
      label: "Dissolved Oxygen",
      value: 3.2,
      direction: "low",
      deviation: 0.68
    },
    ...
  ],
  gradcam_overlay: "<heatmap>"
}
```

#### Step 5: Database Saves Results

**Database** (`backend/database/models.py`):
```sql
INSERT INTO predictions (
  timestamp,
  prediction,
  confidence,
  image_score,
  sensor_score,
  prob_healthy,
  prob_diseased,
  mode,
  ph, tds, water_temp, humidity, dissolved_oxygen,
  image_filename,
  image_size_bytes
) VALUES (...)
```

#### Step 6: Frontend Displays Results

**Frontend** (`frontend/src/components/PredictionCard.tsx`):

Shows:
- ✅ or ❌ diagnosis
- 📊 Confidence ring (animated)
- 🔍 Grad-CAM overlay (heatmap showing which parts of image influenced the decision)
- 📈 If fusion: image_score vs sensor_score comparison
- 📋 If fusion: sensor attribution breakdown

Example display:
```
┌─────────────────────────┐
│  🚨 DISEASED (68%)      │
├─────────────────────────┤
│                         │
│  [Root Image with      │
│   Heatmap Overlay]     │
│                         │
├─────────────────────────┤
│  Visual Analysis: 70%   │
│  Dissolved Oxygen: ⚠️   │
│  pH: ⚠️ (High)          │
│                         │
│  Explanation:           │
│  Your water's DO is    │
│  critically low...     │
└─────────────────────────┘
```

---

## Score Visualization

### What Each Score Means

#### Image Score
- **Definition**: Confidence that image LOOKS diseased
- **Range**: 0.0 to 1.0 (0% to 100%)
- **How it's calculated**: Output of EfficientNet for "diseased" class
- **Example**: 0.85 = "I see 85% diseased visual features"

#### Sensor Score
- **Definition**: Confidence that environment CONDITIONS indicate disease
- **Range**: 0.0 to 1.0 (0% to 100%)
- **How it's calculated**: Output of SensorNet for "diseased" class
- **Example**: 0.45 = "Water conditions are only 45% concerning"

#### Final Prediction (Confidence)
- **Definition**: Combined decision after fusing both scores
- **How it's calculated**: FusionHead network combines image + sensor logits
- **Example**: 
  - Image score: 0.85
  - Sensor score: 0.45
  - Final: 0.68 = "Considering both, 68% confident it's diseased"

### Grad-CAM Heatmap Explained

This red/yellow heatmap on the image shows:
- 🔴 RED = Parts of the image the model thinks are "diseased"
- 🟡 YELLOW = Uncertain regions
- 🟢 GREEN = Parts the model thinks are "healthy"

It's generated using **Grad-CAM (Gradient-weighted Class Activation Mapping)**:
```
What it does:
1. Hook into the last convolutional layer of EfficientNet
2. Calculate gradients flowing backward from "diseased" prediction
3. Weight features by importance (gradient magnitude)
4. Create a heatmap showing spatial importance
5. Overlay on original image

Why it's useful:
- Explains WHICH PARTS influenced the decision
- Builds trust (you can see the model's reasoning)
- Catches model mistakes (if it highlights wrong area, retake photo)
```

---

## Database Storage

After each prediction, all results are saved:

```sql
SELECT * FROM predictions
WHERE id = 42;

Result:
┌────┬──────────────┬────────────┬───────────┬──────────┬─────┬────────┐
│ id │ prediction   │ confidence │ image_sc  │ sensor_s │ pH  │ status │
├────┼──────────────┼────────────┼───────────┼──────────┼─────┼────────┤
│ 42 │ diseased     │ 0.68       │ 0.70      │ 0.60     │ 7.2 │ ...    │
└────┴──────────────┴────────────┴───────────┴──────────┴─────┴────────┘
```

This enables:
- 📊 History page (see past predictions)
- 📈 Analytics (track trends over time)
- 🔍 Audit trail (review decisions)

---

## Summary

| Component | Purpose | Hardcoded? |
|-----------|---------|-----------|
| **Image Classification** | Uses trained EfficientNet on 650 root images | No — learned from data |
| **Default Sensor Values** | Show optimal hydroponics ranges | Yes — education/demo |
| **Sensor Model** | Predicts from water chemistry conditions | No — learned from data |
| **Healthy Root Definition** | Model consensus on 650+ labeled examples | No — learned from data |
| **Browning Logic** | Part of learned pattern; not a simple rule | No — context-dependent |
| **Fusion Weighting** | FusionHead learns how to combine scores | No — learned training |

Everything the system "knows" comes from **training on real data** — nothing is hardcoded except the demo sensor values!

---

## Questions You Might Have

### Q: Can a healthy root have browning?
**A:** YES! Natural browning from maturity, age, or variety is normal. Diseased browning has additional symptoms (slime, soft texture, rapid spread).

### Q: What if image and sensors disagree?
**A:** The FusionHead moderates confidence. Example:
- Image: looks diseased (0.85)
- Sensors: all good (0.30)
- Final: medium confidence (0.55)
- Explanation: "Check your photo angle or clean camera lens"

### Q: Can I use real IoT sensors?
**A:** Not yet! The sensor values are currently hardcoded for demo. To integrate real sensors, you'd:
1. Add MQTT/HTTP listeners for real sensor data
2. Replace DEFAULT_SENSORS with actual readings
3. Retrain sensor model on your specific equipment

### Q: Why only 2 classes (healthy/diseased)?
**A:** The training data was labeled binary. For disease type classification (Pythium vs Fusarium), you'd need separate training data with disease-specific labels.

### Q: How accurate is the model?
**A:** On validation set: ~88% accuracy. Real-world performance depends on:
- Photo quality and angle
- Lighting conditions
- Root size and visibility
- Environmental factors not captured in images

---

**End of Explanation**

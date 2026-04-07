# AI Root Health Monitor - Project Structure & Architecture

## 📋 Complete Project Tree

```
AI_Root_HealthMonitor/
│
├── backend/                              # 🔧 FastAPI REST API Server
│   ├── main.py                          # FastAPI app entry point & startup logic
│   ├── api/
│   │   └── v1/
│   │       ├── router.py                # Central API router (combines endpoints)
│   │       ├── predict.py               # POST /api/v1/predict endpoint
│   │       └── history.py               # GET /api/v1/history endpoint
│   ├── core/
│   │   ├── config.py                    # Settings & environment variables
│   │   └── logging_config.py            # Logging configuration & handlers
│   ├── database/
│   │   ├── db.py                        # SQLite connection, session, table creation
│   │   ├── models.py                    # SQLAlchemy ORM models (Prediction table)
│   │   └── predictions.db               # SQLite database file (auto-created)
│   ├── ml_engine/
│   │   └── predictor.py                 # Model loading & inference logic
│   ├── repositories/
│   │   └── prediction_repo.py           # Database CRUD operations
│   ├── services/
│   │   ├── prediction_service.py        # Prediction workflow orchestration
│   │   └── history_service.py           # History query logic
│   ├── schemas/
│   │   └── prediction.py                # Pydantic request/response models
│   └── logs/
│       └── app.log                      # Runtime application logs
│
├── ml/                                   # 🧠 Machine Learning Pipeline
│   ├── data/
│   │   ├── raw/                         # Original images & sensor data (NOT in git)
│   │   │   ├── healthy/                 # Healthy root images (user adds)
│   │   │   ├── diseased/                # Diseased root images (user adds)
│   │   │   └── sensor/                  # IoT sensor CSV files
│   │   │       ├── pond_iot_2023.csv
│   │   │       ├── pond_iot_2023_raw.csv
│   │   │       ├── cleaned_data_IsDefault_Interpolate.csv
│   │   │       ├── IoTData_25K_with_interpolation_*.csv
│   │   │       ├── IoTData_25K_without_interpolation_*.csv
│   │   │       └── sensor_labeled.csv
│   │   └── processed/                   # Processed train/val split (auto-created)
│   │       ├── train/
│   │       │   ├── healthy/             # 80% training images (split & augmented)
│   │       │   └── diseased/            # 80% training images (split & augmented)
│   │       └── val/
│   │           ├── healthy/             # 20% validation images
│   │           └── diseased/            # 20% validation images
│   ├── models/                          # Trained model artifacts
│   │   ├── best_model.pt                # Primary EfficientNetB0 model
│   │   ├── best_model_v2.pt             # Alternative trained model
│   │   ├── best_model_finetuned.pt      # Fine-tuned version (recommended)
│   │   ├── sensor_model.pt              # Sensor-only classification model
│   │   ├── fusion_head.pt               # Image + sensor fusion layer
│   │   ├── class_names.json             # Label mappings: {"classes": [...], "class_to_idx": {...}}
│   │   ├── sensor_config.json           # Sensor model architecture config
│   │   ├── sensor_scaler.pkl            # Sensor feature normalization scaler
│   │   ├── fusion_config.json           # Fusion head architecture
│   │   ├── training_history.json        # Image model training metrics
│   │   ├── sensor_history.json          # Sensor model training metrics
│   │   ├── fusion_history.json          # Fusion model training metrics
│   │   ├── history_v2.json              # Alternative training history format
│   │   └── finetuning_history.json      # Fine-tuning process metrics
│   └── scripts/                         # Training & data pipeline scripts
│       ├── convert_dataset.py           # ⭐ STEP 0: Convert YOLO dataset to classified images
│       ├── dataset_prep.py              # ⭐ STEP 1: Split & augment raw images
│       ├── train.py                     # ⭐ STEP 2: Train image classification model
│       ├── finetune.py                  # Fine-tune image model on domain data
│       ├── train_sensor_model.py        # Train sensor-only model
│       ├── train_fusion.py              # Train image + sensor fusion model
│       └── generate_sensor_data.py      # Generate synthetic sensor data for testing
│
├── frontend/                             # 🎨 React + TypeScript + Vite Web UI
│   ├── public/
│   │   └── images/                      # Static image assets
│   ├── src/
│   │   ├── main.tsx                     # React app entry point
│   │   ├── App.tsx                      # Root component with routing
│   │   ├── App.css                      # App-level styles
│   │   ├── index.css                    # Global styles & Tailwind
│   │   ├── api/
│   │   │   └── api.ts                   # Axios HTTP client for backend communication
│   │   ├── components/
│   │   │   ├── SensorSliders.tsx        # Sensor input sliders (pH, TDS, temp, humidity, DO)
│   │   │   ├── PredictionCard.tsx       # Display prediction result card
│   │   │   ├── ConfidenceRing.tsx       # Circular confidence visualization
│   │   │   ├── HistoryChart.tsx         # Recharts time-series visualization
│   │   │   ├── Navbar.tsx               # Navigation header component
│   │   │   └── ParticleBackground.tsx  # Animated particle background
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx            # Home page overview
│   │   │   ├── Hero.tsx                 # Hero section with animations
│   │   │   ├── Predict.tsx              # Main prediction interface
│   │   │   └── History.tsx              # Prediction history view & charts
│   │   ├── hooks/
│   │   │   ├── usePrediction.ts         # Custom hook for prediction API calls
│   │   │   ├── useHistory.ts            # Custom hook for history fetching
│   │   │   └── useScrollReveal.ts       # Custom hook for scroll animations
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript interfaces & types
│   │   ├── styles/                      # Utility CSS/Tailwind classes
│   │   └── assets/                      # Source images & graphics
│   ├── package.json                     # NPM dependencies & scripts
│   ├── package-lock.json                # Locked dependency versions
│   ├── index.html                       # HTML entry point
│   ├── vite.config.ts                   # Vite build configuration
│   ├── tsconfig.json                    # Base TypeScript config
│   ├── tsconfig.app.json                # App TypeScript config
│   ├── tsconfig.node.json               # Node TypeScript config
│   ├── eslint.config.js                 # ESLint code quality rules
│   └── README.md                        # Frontend-specific documentation
│
├── venv310/                              # 🐍 Python Virtual Environment (Python 3.10)
│   ├── Scripts/                         # Python executables
│   │   ├── activate.bat                 # Activation script (Windows CMD)
│   │   ├── Activate.ps1                 # Activation script (PowerShell)
│   │   ├── python.exe
│   │   ├── pip.exe
│   │   └── ...
│   ├── Lib/site-packages/               # Installed Python packages
│   └── pyvenv.cfg                       # Virtual environment configuration
│
├── requirements.txt                      # 📦 Python package dependencies
│   │                                    # Install with: pip install -r requirements.txt
│   │                                    # Organized by: ML, Backend, Database, Dev tools
│
├── readme.md                             # 📖 Main setup & usage guide
│   │                                    # ⭐ START HERE when setting up project
│   │                                    # Contains: Requirements, setup steps, running guide
│
├── PROJECT_STRUCTURE.md                  # 📋 This file - detailed architecture & flow
│
└── data/ → Shortcut.lnk                  # Shortcut to external data folder (optional)

```

---

## 📖 Project Overview

**AI Root Health Monitor** is an end-to-end AI system for detecting hydroponic root health in real-time using:

- **🖼️ Computer Vision** — EfficientNet image classification of root systems
- **📊 IoT Sensor Fusion** — Multi-sensor data (pH, TDS, temperature, humidity, dissolved oxygen)
- **🧠 Deep Learning** — PyTorch models for multi-modal health prediction
- **🔄 Transfer Learning** — ImageNet pre-trained weights fine-tuned on domain data
- **💾 Persistent Storage** — SQLite database for prediction history

The system provides **real-time health predictions** via a **FastAPI REST API** with an interactive **React web UI**.

---

## 🏗️ Architecture Overview

```
User Upload Image + Sensor Data
            ↓
┌──────────────────────────────────────┐
│  Frontend (React + TypeScript)       │
│  - Upload interface                  │
│  - Sensor input sliders              │
│  - Real-time visualization           │
└──────────────────────────────────────┘
            ↓ HTTP POST
┌──────────────────────────────────────┐
│  Backend (FastAPI)                   │
│  - Validate inputs                   │
│  - Route requests                    │
│  - Store predictions in DB           │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│  ML Engine (PyTorch)                 │
│  - Load models                       │
│  - Preprocess images                 │
│  - Run inference                     │
│  - Combine predictions (fusion)      │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│  Database (SQLite)                   │
│  - Store predictions                 │
│  - Store sensor data                 │
│  - Store confidence scores           │
└──────────────────────────────────────┘
```

---

## 🔧 Backend (`backend/`) Directory Details

### `main.py`
**FastAPI application entry point**

Responsibilities:
- Initialize FastAPI app instance
- Setup CORS middleware (allows frontend communication)
- Configure logging with structured formatting
- Define app lifecycle (startup/shutdown hooks)
- Create database tables on startup
- Detect GPU/CPU availability
- Define global exception handlers
- Mount API routes

Run with: `uvicorn main:app --reload`

### `api/v1/`
**API route handlers by feature**

#### `router.py`
- Combines all endpoint handlers
- Applies `/api/v1/` prefix
- Imports from predict.py and history.py

#### `predict.py` — `POST /api/v1/predict`
Handles image prediction requests

Accepts:
- Image file (form-data, JPG/PNG)
- Sensor data (optional, JSON string)

Returns:
```json
{
  "prediction": "healthy",
  "confidence": 0.95,
  "image_score": 0.96,
  "sensor_score": 0.92
}
```

Flow:
1. Validate image type & size
2. Parse sensor JSON if provided
3. Call prediction_service
4. Save to database
5. Return results

#### `history.py` — `GET /api/v1/history`
Historical predictions endpoint

Query parameters:
- `limit`: Number of results (default: 50)
- `skip`: Pagination offset (default: 0)
- `start_date`: Filter from date
- `end_date`: Filter to date
- `prediction`: Filter by label (healthy/diseased)

Returns: Array of past predictions with timestamps

### `core/`
**Configuration & logging**

#### `config.py`
Application settings (pydantic-settings):
- `APP_NAME`, `APP_VERSION`
- `DATABASE_URL`: SQLite path
- `MODEL_DIR`: Path to trained models
- `IMAGE_SIZE`: Model input size (224x224)
- `ALLOWED_ORIGINS`: CORS whitelist
- `ALLOWED_TYPES`: Accepted image MIME types

#### `logging_config.py`
Logging system:
- Format with timestamp, level, module, message
- Console + file output (`backend/logs/app.log`)
- Log level: INFO
- Silences noisy libraries

### `database/`
**Persistence layer**

#### `db.py`
SQLAlchemy setup:
- Creates engine with connection pooling
- Provides `SessionLocal` factory
- Implements dependency injection for routes
- Handles transaction rollback on errors

#### `models.py`
ORM model: `Prediction` table

Columns:
- Metadata: `id`, `timestamp` (indexed)
- Results: `prediction`, `confidence`, `image_score`, `sensor_score`
- Mode: `mode` (image_only or fusion)
- Sensors: `ph`, `tds`, `water_temp`, `humidity`, `dissolved_oxygen` (nullable)

### `ml_engine/`
**Inference engine**

#### `predictor.py`
Model loading & predictions

Classes:
- `ImagePredictor`: Loads & runs image model
- `SensorNet`: Sensor-only classifier
- `FusionHead`: Combines predictions

Functions:
- `predict_image()`: Image inference
- `predict_sensor()`: Sensor inference
- `predict_fusion()`: Combined prediction

### `services/`
**Business logic orchestration**

#### `prediction_service.py`
Prediction workflow:
1. Validate image
2. Parse sensor data
3. Convert to tensors
4. Call predictor
5. Store in database
6. Return response

Error handling:
- Unsupported types → 415
- Image too large → 413
- Empty image → 400
- Sensor errors → 422

#### `history_service.py`
Historical data retrieval:
- Query with filtering
- Date range filtering
- Pagination

### `repositories/`
**Data access layer**

#### `prediction_repo.py`
CRUD operations:
- `create()`: Save prediction
- `get()`: Fetch by ID
- `list()`: Paginated list
- `delete()`: Remove prediction
- `get_by_date_range()`: Filter by dates

### `schemas/`
**Pydantic models (request/response validation)**

#### `prediction.py`
- `SensorInput`: Sensor readings structure
- `PredictionRequest`: Request format
- `PredictionResponse`: API response

---

## 🧠 ML Pipeline (`ml/`) Directory Details

### `data/raw/`
**Original, unprocessed data (NOT in git!)**

User must add:
- `healthy/`: JPG/PNG images of healthy roots
- `diseased/`: JPG/PNG images of diseased roots
- `sensor/`: CSV files with IoT sensor readings

### `data/processed/`
**Split & augmented dataset (auto-created)**

After `dataset_prep.py`:
```
processed/
├── train/
│   ├── healthy/      (80% + augmentation)
│   └── diseased/     (80% + augmentation)
└── val/
    ├── healthy/      (20% no augment)
    └── diseased/     (20% no augment)
```

### `models/`
**Trained model artifacts**

Key models:
- `best_model_finetuned.pt` ⭐ — Used by backend (recommended)
- `best_model_v2.pt` — Alternative version
- `sensor_model.pt` — Sensor-only classifier
- `fusion_head.pt` — Image + sensor fusion

Config files:
- `class_names.json`: Index→name mappings
- `training_history.json`: Loss/accuracy per epoch
- `sensor_config.json`: Hyperparameters
- `fusion_config.json`: Architecture details

### `scripts/`
**Training & preparation pipelines**

#### `convert_dataset.py` ⭐ STEP 0
**YOLO dataset → Classified images**

Purpose: Convert LettuCeV YOLO dataset to classification format

Input:
- `images/`: 651 JPEG images
- `labels/`: 651 YOLO annotation files

Process:
- Parse YOLO polygon coordinates
- Classify by class ID:
  - Class 1 → diseased (brown roots)
  - Class 2 → healthy (white roots)
- Extract individual roots
- Resize to 224x224 pixels
- Save to `ml/data/raw/`

Output: ~600+ classified root images

Run: `python ml/scripts/convert_dataset.py`

#### `dataset_prep.py` ⭐ STEP 1
**Raw images → Training dataset (split & augment)**

Input: Raw images in `ml/data/raw/`

Process:
1. Load all images
2. Split 80/20 (train/validation)
3. Randomize
4. Augment training data:
   - Random flips (horizontal/vertical)
   - Rotation (±30°)
   - Color jitter
   - Resize & crop
   - Gaussian blur
5. Normalize with ImageNet mean/std
6. Save to `ml/data/processed/`

Output: ~1000+ images (original + 8x augmented)

Run: `python ml/scripts/dataset_prep.py`

#### `train.py` ⭐ STEP 2
**Train image classification model**

Config:
- Batch size: 32
- Epochs: 30 (early stopping)
- Learning rate: 1e-4
- Input: 224x224
- Classes: 2 (healthy, diseased)

Architecture:
- EfficientNetB0 backbone (ImageNet pre-trained)
- Freeze most layers
- Replace classifier with:
  - Dropout(0.3)
  - Linear(1280 → 256)
  - ReLU
  - Dropout(0.2)
  - Linear(256 → 2)

Handles class imbalance with weighted loss.

Output:
- `best_model.pt`: Best checkpoint
- `training_history.json`: Metrics

Time: 10-30 min GPU, 1-2 hours CPU

Run: `python ml/scripts/train.py`

#### `finetune.py`
**Fine-tune model on new data**

Uses discriminative layer-wise learning rates:
- Earlier layers: lower LR
- Later layers: higher LR
- Stronger augmentation
- Output: `best_model_finetuned.pt`

#### `train_sensor_model.py`
**Sensor-only classifier**

Input: CSV files with sensor readings

Architecture:
- Input: 5 features (pH, TDS, temp, humidity, DO)
- Dense: 64 → 32 → 16
- Output: 2 classes

Output: `sensor_model.pt`

#### `train_fusion.py`
**Image + sensor fusion model**

Process:
1. Load image model (pre-trained)
2. Load sensor model (pre-trained)
3. Extract features from both
4. Fusion head: concatenate → MLPs
5. Train only fusion head (freeze base models)
6. Output: `fusion_head.pt`

Better accuracy than individual models.

#### `generate_sensor_data.py`
**Synthetic sensor data (for testing)**

Generates realistic sensor readings:
- pH: 5.5-8.0
- TDS: 500-2000 ppm
- Water temp: 18-28°C
- Humidity: 40-90%
- Dissolved oxygen: 4-10 ppm

---

## 🎨 Frontend (`frontend/`) Directory Details

### `src/main.tsx`
React entry point

### `src/App.tsx`
Root component with routing (React Router v7):
- `/` → Dashboard
- `/predict` → Prediction interface
- `/history` → History view

### `src/api/api.ts`
HTTP client (Axios):
- Base URL: http://localhost:8000
- Timeout: 30s
- Endpoints: POST /predict, GET /history, GET /health

### `src/components/`
**Reusable UI components**

- `SensorSliders.tsx`: pH, TDS, temp, humidity, DO input sliders
- `PredictionCard.tsx`: Display prediction with emoji & score
- `ConfidenceRing.tsx`: Circular progress visualization
- `HistoryChart.tsx`: Recharts time-series visualization
- `Navbar.tsx`: Navigation header
- `ParticleBackground.tsx`: Animated particle effects (@tsparticles)

### `src/pages/`
**Route pages**

- `Predict.tsx`: Upload image, input sensors, display results
- `History.tsx`: View past predictions, filter, charts
- `Dashboard.tsx`: Overview & quick stats
- `Hero.tsx`: Hero section with Framer Motion animations

### `src/hooks/`
**Custom React hooks**

- `usePrediction.ts`: Upload & prediction API
- `useHistory.ts`: Fetch & filter history
- `useScrollReveal.ts`: Scroll animations (Framer Motion)

### `src/types/index.ts`
TypeScript interfaces:
```typescript
interface PredictionResult {
  prediction: "healthy" | "diseased"
  confidence: number
  timestamp: string
}

interface SensorData {
  ph?: number
  tds?: number
  water_temp?: number
  humidity?: number
  dissolved_oxygen?: number
}
```

---

## 📦 Key Dependencies

### Python (Backend + ML)
- **PyTorch**: torch, torchvision, torchaudio
- **Backend**: fastapi, uvicorn, sqlalchemy, pydantic
- **Data**: numpy, pandas, opencv-python, pillow
- **ML**: scikit-learn, albumentations, tensorboard
- **Visualization**: matplotlib, seaborn

### JavaScript (Frontend)
- **React**: react, react-dom, react-router-dom
- **API**: axios
- **Charts**: recharts
- **Animations**: framer-motion, @tsparticles/react
- **Styling**: tailwindcss
- **Dev**: vite, typescript, eslint

---

## 🔄 Data Flow

### Training Phase
```
Raw Images (LettuCeV YOLO)
    ↓
convert_dataset.py
    ↓
Raw Images (classified)
    ↓
dataset_prep.py (split/augment)
    ↓
Processed Images
    ↓
train.py
    ↓
best_model_finetuned.pt
```

### Prediction Phase
```
User Upload
    ↓
Frontend HTTP POST
    ↓
Backend validate
    ↓
ML Engine predict
    ↓
predictor.py inference
    ↓
PredictionService
    ↓
Repository save
    ↓
Response
    ↓
Frontend display
```

### History Phase
```
User request
    ↓
Frontend GET /history
    ↓
Backend query
    ↓
Repository fetch
    ↓
HistoryService filter
    ↓
Response
    ↓
HistoryChart
```

---

## 🚀 Quick Command Reference

### Setup
```bash
# Virtual environment
python -m venv venv310
venv310\Scripts\activate

# Install Python packages
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

# Install frontend packages
cd frontend && npm install
```

### Training
```bash
python ml/scripts/convert_dataset.py
python ml/scripts/dataset_prep.py
python ml/scripts/train.py
```

### Running
```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Access
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

---

✅ Project architecture fully documented!

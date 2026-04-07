# AI Root Health Monitor 🌱

An AI-powered system that monitors and predicts root health in hydroponic environments using image classification and IoT sensor data.

---

## 📋 Project Overview

This project consists of three main parts:

1. **Backend** (FastAPI) — REST API for predictions and history
2. **Frontend** (React + TypeScript) — Web UI for visualization
3. **ML Pipeline** (PyTorch) — Model training and preprocessing

Data (images) is intentionally NOT in git — you must set it up locally.

---

## 🔧 Prerequisites & System Requirements

### Required
- **Python**: 3.10 or 3.11 (NOT 3.13)
- **Node.js**: v18+ for frontend
- **RAM**: At least 8GB (16GB recommended for training)
- **GPU** (optional but recommended): NVIDIA GPU with CUDA 12.1 support

### Installation Check
Open a terminal and verify:

```bash
# Check Python version
python --version

# Check Node.js version
node --version
npm --version
```

---

## ⚙️ PART 1: One-Time Setup

### Step 1: Clone the Project from GitHub

```bash
# Clone the repository
git clone https://github.com/chaithrarp/AI_RootHealth_MonitorSystem.git

# Navigate to the project directory
cd AI_Root_HealthMonitor
```

**Note**: Make sure you have [Git](https://git-scm.com/) installed on your system.

### Step 2: Create Virtual Environment (Backend & ML)

```bash
# Create a Python virtual environment
python -m venv venv310

# Activate it
# On Windows:
venv310\Scripts\activate

# On Mac/Linux:
source venv310/bin/activate
```

### Step 3: Install Backend & ML Dependencies

```bash
# Install PyTorch (choose ONE based on your system)

# If you have an NVIDIA GPU:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# If you only have CPU:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Then install all other dependencies:
pip install -r requirements.txt
```

### Step 4: Install Frontend Dependencies

```bash
# Navigate to frontend folder
cd frontend

# Install Node packages
npm install

# Return to root
cd ..
```

---

## 📁 PART 2: Data Setup (IMPORTANT!)

Since raw images are NOT in git, you must prepare them locally. This project uses **LettuCeV dataset** with YOLO annotations.

### Option A: Converting LettuCeV Dataset (Recommended)

If you have the LettuCeV dataset with YOLO annotations, the conversion script will automatically classify and prepare the data. First, update the dataset path in the script, then proceed to PART 3 STEP 0 to run it.

Update `ml/scripts/convert_dataset.py`:

```python
DATASET_DIR = Path(r"C:\Users\Chait\Downloads\LettuCeV_dataset")  # ← Change to your dataset path
```

---

### Option B: Manual Image Classification (Alternative)

If you have images without YOLO annotations, manually organize them:

```
ml/
└── data/
    └── raw/
        ├── healthy/          ← Add healthy root images here (.jpg, .png)
        └── diseased/         ← Add diseased root images here (.jpg, .png)
```

**Requirements:**
- PNG or JPG format
- At least 50 images per category (more = better)
- Close-up photos of root systems
- File sizes reasonable (<5MB each)

---

## 🚀 PART 3: Running the System

### STEP 0: Convert YOLO Dataset (If Using LettuCeV)

**This step is ONLY needed if you have LettuCeV dataset with YOLO annotations.**

```bash
# Make sure you're in the project root and virtual environment is activated

python ml/scripts/convert_dataset.py
```

**What this does:**
1. Reads YOLO label files with polygon coordinates
2. Automatically classifies roots based on class id:
   - Class 1 = Diseased roots → saved to `ml/data/raw/diseased/`
   - Class 2 = Healthy roots → saved to `ml/data/raw/healthy/`
3. Crops individual roots from full images
4. Resizes each crop to 224x224 pixels
5. Saves ~600+ classified root images

**Expected output:**
```
LettuCeV Dataset Converter
✅ 651 images processed
✅ Healthy: 320+ images saved
✅ Diseased: 280+ images saved
```

**After this step**, your `ml/data/raw/` folder is populated with classified images.

---

### STEP 1: Prepare Dataset (Split & Augment)

Once you have images in `ml/data/raw/healthy/` and `ml/data/raw/diseased/`:

```bash
# Make sure you're in the project root and virtual environment is activated

python ml/scripts/dataset_prep.py
```

**What this does:**
1. Reads all images from `ml/data/raw/healthy/` and `ml/data/raw/diseased/`
2. Splits them 80/20 into train/validation folders
3. Creates 8x augmented versions of each training image (flips, rotations, color changes)
4. Saves everything to `ml/data/processed/`

**Expected output:**
```
Dataset ready for training!
TOTAL: ~1000+ images (after augmentation)
```

---

### STEP 2: Train the Model (One Time)

After preparing data, train the AI model:

```bash
# Make sure virtual environment is activated

python ml/scripts/train.py
```

**What this does:**
1. Loads the processed dataset
2. Uses an EfficientNet model (pre-trained on ImageNet)
3. Trains it to recognize healthy vs diseased roots
4. Saves the best model to `ml/models/best_model_finetuned.pt`

**This takes:**
- ~10-30 minutes on GPU
- ~1-2 hours on CPU

---

### STEP 3: Run the Backend (API Server)

In a **new terminal**, activate the virtual environment and start the backend:

```bash
# Activate virtual environment
venv310\Scripts\activate

# Navigate to backend folder
cd backend

# Start FastAPI server with auto-reload (detects code changes)
uvicorn main:app --reload
```

**Expected output:**
```
INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO: Started server process [1234]
```

**Access the API:**
- Main URL: http://localhost:8000
- API docs: http://localhost:8000/docs (interactive Swagger UI)
- Health check: http://localhost:8000/health

**Note:** The `--reload` flag auto-restarts the server when you modify code (useful during development)

---

### STEP 4: Run the Frontend (Web UI)

In a **new terminal**, navigate to frontend and start dev server:

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Start Vite dev server
npm run dev
```

**Expected output:**
```
VITE v8.0.0  ready in 234 ms

➜  Local:   http://localhost:5173/
```

**Open in browser:**
- Visit: http://localhost:5173
- You'll see the Root Health Monitor UI

---

## 📊 PART 4: Using the System

### Make sure everything is running

Before using, verify both servers are active:

1. **Backend running** (Terminal 1)
   ```
   uvicorn main:app --reload
   ```
   Should show: `Uvicorn running on http://127.0.0.1:8000`

2. **Frontend running** (Terminal 2)
   ```
   npm run dev
   ```
   Should show: `Local: http://localhost:5173/`

### Upload a Root Image for Prediction

1. Go to http://localhost:5173
2. Click "Upload Image" on the Predict page
3. Select a root image (JPG/PNG)
4. (Optional) Enter sensor data if you have it
5. Click "Predict"
6. View the result: **Healthy** or **Diseased** with confidence score

### View Prediction History

1. Go to History page
2. See all previous predictions
3. Filter by date or status

---

## 🔄 PART 5: Re-training with New Data

If you add new images and want to retrain:

### Scenario A: Adding More YOLO Dataset

```bash
# 1. Update DATASET_DIR in ml/scripts/convert_dataset.py with new dataset path

# 2. Convert and classify new images
python ml/scripts/convert_dataset.py

# 3. This adds new images to ml/data/raw/healthy/ and ml/data/raw/diseased/

# 4. Prepare data (splits and augments all images including new ones)
python ml/scripts/dataset_prep.py

# 5. Train again
python ml/scripts/train.py

# 6. Restart backend (stop with Ctrl+C, then run again):
cd backend
uvicorn main:app --reload
```

### Scenario B: Adding Manual Images

```bash
# 1. Manually add new images to:
#    - ml/data/raw/healthy/
#    - ml/data/raw/diseased/

# 2. Prepare data (splits and augments all images)
python ml/scripts/dataset_prep.py

# 3. Train again
python ml/scripts/train.py

# 4. Restart backend (stop with Ctrl+C, then run again):
cd backend
uvicorn main:app --reload
```

---

## 🛠️ Troubleshooting

### Python version error
```
Python 3.13 not compatible!
→ Install Python 3.10 or 3.11 instead
```

### "ModuleNotFoundError: torch"
```
→ Make sure virtual environment is activated
→ Run: pip install -r requirements.txt
```

### "Port 8000 already in use" or "Address already in use"
```
→ Either wait for backend to finish, or kill the process
→ On Windows: netstat -ano | findstr :8000 (then taskkill /PID <pid> /F)
→ Or change port: uvicorn main:app --reload --port 8001
```

### GPU not detected (shows CPU)
```
→ Check CUDA installation: nvidia-smi
→ Reinstall PyTorch with correct CUDA version
→ Or just use CPU (slower but works)
```

### No images found in ml/data/processed
```
→ Make sure convert_dataset.py ran without errors
→ Check that ml/data/raw/healthy/ and ml/data/raw/diseased/ have files
```

### Uvicorn command not found
```
→ Make sure virtual environment is activated
→ Run: pip install uvicorn
```

---

## 📚 Project Structure (Details)

```
AI_Root_HealthMonitor/
├── backend/                          # FastAPI REST API
│   ├── main.py                       # Start backend here
│   ├── api/v1/
│   │   ├── predict.py                # Image prediction endpoint
│   │   └── history.py                # History endpoint
│   ├── ml_engine/
│   │   └── predictor.py              # Model inference logic
│   ├── database/
│   │   ├── db.py                     # SQLite setup
│   │   └── models.py                 # Database tables
│   └── services/
│       └── prediction_service.py     # Prediction workflow
│
├── frontend/                         # React + TypeScript web UI
│   ├── package.json                  # Node dependencies
│   ├── vite.config.ts               # Build config
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx                  # Main component
│   │   ├── pages/
│   │   │   ├── Predict.tsx          # Image upload page
│   │   │   └── History.tsx          # Prediction history page
│   │   ├── components/               # Reusable UI components
│   │   └── hooks/
│   │       └── usePrediction.ts      # API call hooks
│   └── public/                       # Static assets
│
├── ml/                               # Machine learning
│   ├── data/
│   │   ├── raw/                     # Original images (MUST ADD THIS)
│   │   │   ├── healthy/             # Healthy root images
│   │   │   └── diseased/            # Diseased root images
│   │   └── processed/               # Processed train/val split
│   ├── models/                      # Trained models
│   │   └── best_model_finetuned.pt  # Main model (loaded by backend)
│   └── scripts/
│       ├── dataset_prep.py          # RUN THIS FIRST
│       ├── train.py                 # RUN THIS SECOND
│       └── convert_dataset.py       # (Optional) convert YOLO dataset
│
└── requirements.txt                 # All Python dependencies
```

---

## 🚦 Quick Start Checklist

- [ ] Python 3.10/3.11 installed
- [ ] Node.js installed
- [ ] Virtual environment created and activated
- [ ] PyTorch and dependencies installed
- [ ] Frontend dependencies installed (npm install)
- [ ] LettuCeV dataset downloaded (with images/ and labels/ folders)
- [ ] Updated DATASET_DIR path in `ml/scripts/convert_dataset.py`
- [ ] Ran `python ml/scripts/convert_dataset.py` (converts YOLO to classified images)
- [ ] Verified images in `ml/data/raw/healthy/` and `ml/data/raw/diseased/`
- [ ] Ran `python ml/scripts/dataset_prep.py` (splits and augments)
- [ ] Ran `python ml/scripts/train.py` (trains model)
- [ ] Started backend with `python backend/main.py`
- [ ] Started frontend with `npm run dev`
- [ ] Visited http://localhost:5173

---

## 📞 Common Commands Reference

```bash
# Activate virtual environment
venv310\Scripts\activate

# Convert YOLO dataset to classified images (Step 0)
python ml/scripts/convert_dataset.py

# Data preparation (splits and augments)
python ml/scripts/dataset_prep.py

# Train model
python ml/scripts/train.py

# Start backend (from backend/ folder)
cd backend
uvicorn main:app --reload

# Start frontend (from frontend/ folder)
cd frontend
npm run dev

# Lint frontend code
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build
```

---

## 🎓 Understanding Each Step

### Dataset Conversion (`convert_dataset.py`)
- **Input**: LettuCeV dataset with:
  - `images/` folder (651 JPG files)
  - `labels/` folder (651 YOLO annotation TXT files)
- **How YOLO annotations work**: Each label file contains polygon coordinates and a class ID
  - Class 1 = Diseased roots (brown/rotting)
  - Class 2 = Healthy roots (white/clean)
- **Process**: 
  - Reads YOLO polygon coordinates
  - Converts to bounding boxes
  - Crops individual roots from full images
  - Resizes each crop to 224x224 pixels
- **Output**: Organized images in `ml/data/raw/healthy/` and `ml/data/raw/diseased/`
- **Why**: Automatically classifies roots without manual labeling. One large image can contain multiple roots, the script extracts each one.

### Dataset Preparation (`dataset_prep.py`)
- **Input**: Raw images in `ml/data/raw/`
- **Process**: Splits images 80% train, 20% validation
- **Augmentation**: Creates 8x more training images via flips, rotations, color changes
- **Output**: Organized in `ml/data/processed/train/` and `ml/data/processed/val/`
- **Why**: More data = better model. Augmentation helps without needing more images.

### Model Training (`train.py`)
- **Input**: Augmented images from `ml/data/processed/`
- **Process**: Uses EfficientNet (proven, lightweight model)
- **Training**: Learns to classify roots as healthy or diseased
- **Output**: Best model saved as `best_model_finetuned.pt`
- **Why**: Trains a custom model on YOUR specific root images

### Backend API (`main.py`)
- **Purpose**: Runs the prediction server
- **Input**: Accepts image uploads via HTTP
- **Process**: Loads the trained model, runs inference
- **Output**: Returns prediction (healthy/diseased + confidence)
- **Stores**: All predictions in SQLite database

### Frontend Web App (`npm run dev`)
- **Purpose**: Provides user-friendly interface
- **Features**: Upload images, view predictions, see history
- **Communicates**: With backend API via HTTP requests
- **Tech**: React, TypeScript, Tailwind CSS

---

## � Getting the LettuCeV Dataset

The LettuCeV dataset is NOT included in this repository (too large for git).

### Download Options

1. **Kaggle** (Recommended)
   - Visit: https://www.kaggle.com/datasets/littlebird612/lettucevdataset
   - Download as ZIP
   - Extract to `C:\Users\YourUsername\Downloads\LettuCeV_dataset`

2. **Direct from researchers**
   - Contact the LettuCeV project for academic datasets

### Dataset Structure

Expected folder structure after extraction:

```
LettuCeV_dataset/
├── images/
│   ├── image_001.jpg
│   ├── image_002.jpg
│   └── ... (651 total images)
└── labels/
    ├── image_001.txt
    ├── image_002.txt
    └── ... (651 YOLO annotation files)
```

### File Format: YOLO Segmentation

Each `.txt` file contains polygon coordinates in YOLO format:

```
class_id normalized_x1 normalized_y1 normalized_x2 normalized_y2 ...
```

Example:
```
2 0.45 0.32 0.55 0.32 0.55 0.42 0.45 0.42
1 0.20 0.10 0.30 0.15 0.35 0.25 0.25 0.20
```

- **Class 1** = Diseased roots (brown/rotting)
- **Class 2** = Healthy roots (white/clean)
- **Coordinates** = Normalized polygon points (0-1 scale)

The `convert_dataset.py` script automatically parses this and creates classified images.

---

1. **Start small**: Test with 50 images per category first
2. **Check GPU**: Run `nvidia-smi` to see if GPU is being used during training
3. **Monitor training**: Watch accuracy go up in the console output
4. **Keep data organized**: Use clearly named folders for images
5. **Save predictions**: History is automatically saved to database

---

## 📝 License & Attribution

AI Root Health Monitor — Built for hydroponic plant monitoring.

**Technologies used:**
- PyTorch (model training)
- FastAPI (backend API)
- React + TypeScript (frontend)
- Vite (build tool)

---

Done? Your system is ready to predict root health! 🚀
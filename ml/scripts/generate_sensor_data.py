# ml/scripts/generate_sensor_data.py
# ============================================================
#  Sensor Dataset Generator
#  Uses real IoT data distributions + Pythium domain knowledge
#  to generate a labeled sensor dataset for fusion model
# ============================================================

import numpy as np
import pandas as pd
import os

np.random.seed(42)

OUTPUT_PATH = "ml/data/sensor/sensor_labeled.csv"
N_HEALTHY   = 2000
N_DISEASED  = 2000

print("="*50)
print("  Sensor Dataset Generator")
print("="*50)

# ── load real data to get realistic base distributions ──
real_df = pd.read_csv("ml/data/sensor/pond_iot_2023.csv")
real_df2 = pd.read_csv(
    "ml/data/sensor/cleaned_data_IsDefault_Interpolate.csv"
)
# clean real_df2
real_df2 = real_df2[
    (real_df2["pH"] > 4) & (real_df2["pH"] < 9) &
    (real_df2["TDS"] > 0) &
    (real_df2["water_temp"] > 10)
]

print(f"\n  Real data loaded:")
print(f"  pond_iot_2023     : {len(real_df):,} rows")
print(f"  cleaned_interpolate: {len(real_df2):,} rows")

# ── real data stats (used to anchor our synthetic data) ──
# pond data: pH mean=7.5, TDS mean=335, temp mean=24.6
# but that's aquaponics (fish+plants) — higher pH is normal there
# for pure hydroponics lettuce, we shift ranges accordingly

def generate_healthy(n):
    """
    Healthy lettuce hydroponics:
    pH      : 5.8 – 6.5  (optimal for lettuce)
    TDS     : 800 – 1400 ppm
    temp    : 18 – 22°C  (cool, Pythium suppressed)
    humidity: 50 – 70%
    DO      : 7 – 10 mg/L (high oxygen = healthy roots)
    """
    return pd.DataFrame({
        "pH": np.clip(
            np.random.normal(6.1, 0.2, n), 5.6, 6.8
        ),
        "TDS": np.clip(
            np.random.normal(1100, 150, n), 700, 1500
        ),
        "water_temp": np.clip(
            np.random.normal(20.0, 1.2, n), 16, 23
        ),
        "humidity": np.clip(
            np.random.normal(60, 6, n), 45, 75
        ),
        "dissolved_oxygen": np.clip(
            np.random.normal(8.5, 0.8, n), 6.5, 11
        ),
        "label": 0,
        "label_name": "healthy"
    })

def generate_diseased(n):
    """
    Diseased lettuce (Pythium root rot):
    pH      : drifts outside optimal — either too low or too high
    TDS     : rises (roots can't absorb) OR drops sharply
    temp    : above 24°C — Pythium thrives
    humidity: above 80% — accelerates spread
    DO      : drops below 5 mg/L — root rot depletes oxygen
    
    We mix 3 sub-patterns to make it realistic:
    - early stage  (40%): slight drift from optimal
    - mid stage    (35%): clear out of range
    - late stage   (25%): severely out of range
    """
    n_early = int(n * 0.40)
    n_mid   = int(n * 0.35)
    n_late  = n - n_early - n_mid

    # early — slight drift
    early = pd.DataFrame({
        "pH": np.clip(np.random.normal(6.9, 0.3, n_early), 6.5, 7.5),
        "TDS": np.clip(np.random.normal(1550, 120, n_early), 1400, 1800),
        "water_temp": np.clip(np.random.normal(24.5, 0.8, n_early), 23, 26),
        "humidity": np.clip(np.random.normal(78, 5, n_early), 72, 88),
        "dissolved_oxygen": np.clip(np.random.normal(5.5, 0.6, n_early), 4, 7),
        "label": 1,
        "label_name": "diseased"
    })

    # mid — clearly out of range
    mid = pd.DataFrame({
        "pH": np.clip(np.random.normal(7.4, 0.4, n_mid), 7.0, 8.2),
        "TDS": np.clip(np.random.normal(1800, 150, n_mid), 1500, 2200),
        "water_temp": np.clip(np.random.normal(26.0, 1.0, n_mid), 24, 29),
        "humidity": np.clip(np.random.normal(85, 5, n_mid), 78, 95),
        "dissolved_oxygen": np.clip(np.random.normal(4.0, 0.7, n_mid), 2.5, 5.5),
        "label": 1,
        "label_name": "diseased"
    })

    # late — severely out of range
    late = pd.DataFrame({
        "pH": np.clip(np.random.normal(7.9, 0.5, n_late), 7.5, 9.0),
        "TDS": np.clip(np.random.normal(2100, 200, n_late), 1800, 2600),
        "water_temp": np.clip(np.random.normal(28.5, 1.2, n_late), 26, 32),
        "humidity": np.clip(np.random.normal(91, 4, n_late), 85, 99),
        "dissolved_oxygen": np.clip(np.random.normal(2.5, 0.6, n_late), 1.0, 4.0),
        "label": 1,
        "label_name": "diseased"
    })

    return pd.concat([early, mid, late], ignore_index=True)

# ── generate ──
print(f"\n  Generating {N_HEALTHY} healthy samples...")
healthy  = generate_healthy(N_HEALTHY)

print(f"  Generating {N_DISEASED} diseased samples...")
diseased = generate_diseased(N_DISEASED)

# ── combine and shuffle ──
df = pd.concat([healthy, diseased], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# ── add small realistic noise (sensor jitter) ──
for col in ["pH", "TDS", "water_temp", "humidity", "dissolved_oxygen"]:
    noise_scale = {"pH": 0.02, "TDS": 3.0,
                   "water_temp": 0.05, "humidity": 0.5,
                   "dissolved_oxygen": 0.05}[col]
    df[col] += np.random.normal(0, noise_scale, len(df))

# round to realistic sensor precision
df["pH"]               = df["pH"].round(2)
df["TDS"]              = df["TDS"].round(1)
df["water_temp"]       = df["water_temp"].round(2)
df["humidity"]         = df["humidity"].round(1)
df["dissolved_oxygen"] = df["dissolved_oxygen"].round(2)

# ── save ──
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
df.to_csv(OUTPUT_PATH, index=False)

print(f"\n  Dataset Summary:")
print(f"  Total rows  : {len(df):,}")
print(f"  Healthy     : {(df['label']==0).sum():,}")
print(f"  Diseased    : {(df['label']==1).sum():,}")
print(f"\n  Feature ranges:")
print(df.groupby("label_name")[
    ["pH","TDS","water_temp","humidity","dissolved_oxygen"]
].mean().round(2).to_string())
print(f"\n  ✅ Saved to {OUTPUT_PATH}")
print("="*50)
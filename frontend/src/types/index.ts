// frontend/src/types/index.ts

// ─── Prediction Response (from POST /api/v1/predict) ───────────────────────
export interface Probabilities {
  healthy:  number
  diseased: number
}

export interface SensorAttribution {
  key:       string
  label:     string
  value:     number
  unit:      string
  direction: 'normal' | 'low' | 'high'
  deviation: number   // 0–1
  range_lo:  number
  range_hi:  number
}

export interface PredictionResponse {
  id:            number
  prediction:    'healthy' | 'diseased'
  confidence:    number
  image_score:   number
  sensor_score:  number | null
  probabilities: Probabilities
  mode:          'image_only' | 'sensor_only' | 'fusion'
  timestamp:     string

  // new
  gradcam_overlay:     string | null
  sensor_attributions: SensorAttribution[] | null
}

// ─── Sensor Readings (embedded in history records) ──────────────────────────
export interface SensorReadings {
  ph:                      number
  temperature:             number
  dissolved_oxygen:        number
  electrical_conductivity: number
  turbidity:               number
}

// ─── History Record (from GET /api/v1/history) ──────────────────────────────
export interface HistoryRecord {
  id:            number
  prediction:    'healthy' | 'diseased'
  confidence:    number
  image_score:   number
  sensor_score:  number | null
  probabilities: Probabilities
  mode:          'image_only' | 'sensor_only' | 'fusion'
  timestamp:     string
  sensor_readings: SensorReadings | null
}

// ─── History Stats ────────────────────────────────────────────────────────────
export interface HistoryStats {
  total_scans:        number
  disease_rate:       number
  healthy_count:      number
  diseased_count:     number
  average_confidence: number
}

// ─── Sensor Input ─────────────────────────────────────────────────────────────
export interface SensorInput {
  ph:                      number
  temperature:             number
  dissolved_oxygen:        number
  electrical_conductivity: number
  turbidity:               number
}

// ─── Predict Form State ───────────────────────────────────────────────────────
export interface PredictFormState {
  image:      File | null
  sensors:    SensorInput | null
  useSensors: boolean
}
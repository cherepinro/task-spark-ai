"""
FastAPI ML Service for Procrastination Score Prediction

Endpoint: POST /features
Input: {"features": [float, float, ..., float]} (10 features)
Output: {"score": int, "level": str, "confidence": float}
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import List
import pickle
import numpy as np
import os

app = FastAPI(
    title="Procrastination Score ML Service",
    description="Predicts procrastination score based on task management behavior",
    version="1.0.0"
)

# Load model on startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'procrastination-model.pkl')
model_data = None

@app.on_event("startup")
async def load_model():
    global model_data
    try:
        with open(MODEL_PATH, 'rb') as f:
            model_data = pickle.load(f)
        print("✅ Model loaded successfully")
        print(f"Feature names: {model_data['feature_names']}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        raise

class FeaturesRequest(BaseModel):
    features: List[float] = Field(..., min_length=10, max_length=10)
    
    @field_validator('features')
    @classmethod
    def validate_features(cls, v):
        if len(v) != 10:
            raise ValueError("Must provide exactly 10 features")
        # Validate feature ranges
        if not all(0 <= v[i] <= 1 for i in [0, 2, 4, 6, 7, 8, 9]):
            raise ValueError("Features 0,2,4,6,7,8,9 must be in range [0,1]")
        if not (0 <= v[1] <= 10):
            raise ValueError("Feature 1 (avg_task_completion_time) must be in range [0,10]")
        if not (0 <= v[3] <= 30):
            raise ValueError("Feature 3 (days_since_last_completion) must be in range [0,30]")
        if not (0 <= v[5] <= 30):
            raise ValueError("Feature 5 (avg_task_age) must be in range [0,30]")
        return v

class PredictionResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Procrastination score (0-100)")
    level: str = Field(..., description="Level: low, moderate, or high")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence (0-1)")
    features_used: List[str] = Field(..., description="Feature names")

@app.get("/")
async def root():
    return {
        "service": "Procrastination Score ML Service",
        "status": "running",
        "model_loaded": model_data is not None,
        "endpoint": "POST /features"
    }

@app.get("/health")
async def health():
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "healthy", "model": "loaded"}

@app.post("/features", response_model=PredictionResponse)
async def predict_procrastination(request: FeaturesRequest):
    """
    Predict procrastination score from 10 behavioral features.
    
    Features (in order):
    1. tasks_overdue_ratio (0-1)
    2. avg_task_completion_time (0-10 days)
    3. tasks_with_high_priority_incomplete (0-1)
    4. days_since_last_completion (0-30)
    5. task_creation_to_due_ratio (0-1)
    6. avg_task_age (0-30 days)
    7. completion_rate_last_week (0-1)
    8. tasks_in_progress_ratio (0-1)
    9. project_switching_frequency (0-1)
    10. ai_suggestions_ignored_ratio (0-1)
    
    Returns:
    - score: 0-100 (procrastination severity)
    - level: "low" (0-30), "moderate" (31-60), or "high" (61-100)
    - confidence: Model prediction confidence
    """
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Prepare features
        features_array = np.array(request.features).reshape(1, -1)
        
        # Scale features
        features_scaled = model_data['scaler'].transform(features_array)
        
        # Get prediction and probability
        prediction_class = model_data['model'].predict(features_scaled)[0]
        probabilities = model_data['model'].predict_proba(features_scaled)[0]
        
        # Map class to score range
        # Class 0 (low): 0-30, Class 1 (moderate): 31-60, Class 2 (high): 61-100
        score_map = {
            0: (0, 30),
            1: (31, 60),
            2: (61, 100)
        }
        
        min_score, max_score = score_map[int(prediction_class)]
        
        # Use the probability to interpolate within the range
        confidence = probabilities[int(prediction_class)]
        score = int(min_score + (max_score - min_score) * confidence)
        
        # Determine level
        if score <= 30:
            level = "low"
        elif score <= 60:
            level = "moderate"
        else:
            level = "high"
        
        return PredictionResponse(
            score=score,
            level=level,
            confidence=float(confidence),
            features_used=model_data['feature_names']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

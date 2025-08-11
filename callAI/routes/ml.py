from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
import joblib
import json
import os

# Paths to artifacts
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), '../artifacts')
MODEL_PATH = os.path.join(ARTIFACTS_DIR, 'model_20250811_235624.pkl')
SCALER_PATH = os.path.join(ARTIFACTS_DIR, 'scaler_20250811_235624.pkl')
META_PATH = os.path.join(ARTIFACTS_DIR, 'meta_20250811_235624.json')

# Load meta
with open(META_PATH, 'r') as f:
	meta = json.load(f)
FEATURE_COLUMNS = meta['feature_columns']

# Load model and scaler
model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

router = APIRouter(
	prefix="/ml",
	tags=["ml"]
)

class PredictRequest(BaseModel):
	Age: float
	GraduateOrNot: int
	AnnualIncome: float
	FamilyMembers: float
	FrequentFlyer: int
	EverTravelledAbroad: int

@router.post('/predict')
async def predict(req: PredictRequest):
	# Convert input to feature array
	try:
		X_input = np.array([[getattr(req, col) for col in FEATURE_COLUMNS]])
	except Exception as e:
		raise HTTPException(status_code=400, detail=f"Invalid input: {e}")

	# Scale continuous columns (Age, AnnualIncome, FamilyMembers)
	cont_idx = [i for i, c in enumerate(FEATURE_COLUMNS) if c in ['Age', 'AnnualIncome', 'FamilyMembers']]
	if scaler is not None:
		X_scaled = X_input.copy()
		X_scaled[:, cont_idx] = scaler.transform(X_input[:, cont_idx])
	else:
		X_scaled = X_input

	# Predict
	pred = int(model.predict(X_scaled)[0])
	prob = float(model.predict_proba(X_scaled)[0][1]) if hasattr(model, 'predict_proba') else None

	return {
		'prediction': pred,
		'probability': prob,
		'features': dict(zip(FEATURE_COLUMNS, X_input[0].tolist()))
	}

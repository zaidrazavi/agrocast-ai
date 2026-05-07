from flask import Flask, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

print("Loading trained model...")

# Load trained model
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model_path = os.path.join(
    BASE_DIR,
    '../models/sarimax_model.pkl'
)

model = joblib.load(model_path)

print("✅ Model loaded successfully!")

# Home route
@app.route('/')
def home():
    return {
        "message": "🌾 AgroCast AI Backend Running Successfully"
    }

# Forecast route
@app.route('/forecast')
def forecast():

    print("Generating predictions...")

    # Predict next 100 days
    predictions = model.forecast(steps=100)

    # Convert to clean list
    result = [round(float(x), 2) for x in predictions]

    return jsonify({
        "forecast_days": 100,
        "humidity_predictions": result
    })

# Run app
if __name__ == '__main__':
    app.run(debug=True)
from flask import Flask, jsonify
from flask_cors import CORS
import joblib
import os
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

app = Flask(__name__)
CORS(app)

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model path
model_path = os.path.join(
    BASE_DIR,
    '../models/sarimax_model.pkl'
)

print("Checking model...")

# Load model if exists
if os.path.exists(model_path):

    print("Loading trained model...")
    model = joblib.load(model_path)
    print("✅ Model loaded successfully!")

# Train model if missing
else:

    print("⚠️ Model not found. Training new model...")

    # Dataset path
    data_path = os.path.join(
        BASE_DIR,
        '../data/weather_data.csv'
    )

    # Load dataset
    df = pd.read_csv(data_path)

    # Convert date column
    df['date'] = pd.to_datetime(df['date'])

    # Set date as index
    df.set_index('date', inplace=True)

    # Select humidity column
    humidity = df['humidity']

    # Train SARIMAX model
    model_obj = SARIMAX(
        humidity,
        order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 12)
    )

    model = model_obj.fit()

    print("✅ New model trained successfully!")

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

    # Forecast next 100 days
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
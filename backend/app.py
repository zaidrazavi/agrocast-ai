from flask import Flask, jsonify, request
from flask_cors import CORS

import pandas as pd
import joblib
import os
import requests

from statsmodels.tsa.statespace.sarimax import SARIMAX

app = Flask(__name__)
CORS(app)

# =========================================
# BASE DIRECTORY
# =========================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =========================================
# MODEL PATH
# =========================================

model_path = os.path.join(
    BASE_DIR,
    '../models/sarimax_model.pkl'
)

# =========================================
# LOAD MODEL IF EXISTS
# =========================================

if os.path.exists(model_path):

    print("Loading trained model...")

    model = joblib.load(model_path)

    print("✅ Model loaded successfully!")

# =========================================
# TRAIN MODEL IF NOT FOUND
# =========================================

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

    # Save model
    joblib.dump(model, model_path)

    print("✅ New model trained successfully!")

# =========================================
# HOME ROUTE
# =========================================

@app.route('/')
def home():

    return {
        "message": "🌾 AgroCast AI Backend Running Successfully"
    }

# =========================================
# FORECAST ROUTE
# =========================================

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

# =========================================
# WEATHER ROUTE
# =========================================

@app.route('/weather')
def weather():

    city = request.args.get('city')

    if not city:

        return jsonify({
            "error": "City parameter missing"
        }), 400

    API_KEY = os.getenv("OPENWEATHER_API_KEY")

    if not API_KEY:

        return jsonify({
            "error": "API key missing"
        }), 500

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?q={city}&appid={API_KEY}&units=metric"
    )

    response = requests.get(url)

    data = response.json()

    return jsonify(data)

# =========================================
# RUN APP
# =========================================

if __name__ == '__main__':

    app.run(debug=True)
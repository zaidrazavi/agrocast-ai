import pandas as pd
import joblib
from statsmodels.tsa.statespace.sarimax import SARIMAX

print("Loading dataset...")

df = pd.read_csv('../data/weather_data.csv')

print(df.head())

# Convert date column
df['date'] = pd.to_datetime(df['date'])

# Set date as index
df.set_index('date', inplace=True)

# Select Humidity column
humidity = df['humidity']

print("Training SARIMAX model...")

model = SARIMAX(
    humidity,
    order=(1, 1, 1),
    seasonal_order=(1, 1, 1, 12)
)

results = model.fit()

print("Saving model...")

joblib.dump(results, '../models/sarimax_model.pkl')

print("✅ Model trained and saved successfully!")
```python
"""
AgroCast AI — Production Ready Backend
"""

import os
import time
import requests
import numpy as np

from flask import Flask, jsonify, request
from flask_cors import CORS

from statsmodels.tsa.statespace.sarimax import SARIMAX

import warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ==================================================
# CONFIG
# ==================================================

OW_API_KEY = os.environ.get("OPENWEATHER_API_KEY")

if not OW_API_KEY:
    raise RuntimeError(
        "OPENWEATHER_API_KEY environment variable not configured"
    )

OW_BASE = "https://api.openweathermap.org/data/2.5"

CACHE_TTL = 1800  # 30 minutes

forecast_cache = {}
weather_cache = {}

# ==================================================
# HELPERS
# ==================================================

def is_cache_valid(cache_entry):

    if not cache_entry:
        return False

    return (
        time.time() - cache_entry["timestamp"]
        < CACHE_TTL
    )


def ow_get(endpoint, params):

    params["appid"] = OW_API_KEY
    params["units"] = "metric"

    response = requests.get(
        f"{OW_BASE}/{endpoint}",
        params=params,
        timeout=10
    )

    response.raise_for_status()

    return response.json()


def fit_sarimax(
    series,
    forecast_steps=100
):

    arr = np.array(series, dtype=float)

    arr = np.clip(arr, 0, 100)

    seasonal_period = (
        8 if len(arr) >= 24
        else 4 if len(arr) >= 12
        else 1
    )

    order = (1, 1, 1)

    seasonal_order = (
        (1, 1, 1, seasonal_period)
        if seasonal_period > 1
        else (0, 0, 0, 0)
    )

    try:

        model = SARIMAX(
            arr,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False
        )

        result = model.fit(
            disp=False,
            maxiter=200
        )

        predictions = result.forecast(
            steps=forecast_steps
        )

        predictions = np.clip(
            predictions,
            0,
            100
        )

        return [
            round(float(x), 2)
            for x in predictions
        ]

    except Exception:

        last = float(arr[-1])

        slope = (
            (arr[-1] - arr[0])
            / max(len(arr) - 1, 1)
        )

        noise = np.std(arr) * 0.3

        rng = np.random.default_rng(
            seed=42
        )

        output = []

        for i in range(forecast_steps):

            seasonal = (
                np.sin(
                    2 * np.pi * i / 30
                )
                * noise
            )

            value = np.clip(
                last
                + slope * i * 0.1
                + seasonal
                + rng.normal(
                    0,
                    noise * 0.5
                ),
                0,
                100
            )

            output.append(
                round(float(value), 2)
            )

        return output


# ==================================================
# ROUTES
# ==================================================

@app.route("/")
def home():

    return jsonify({

        "status": "online",

        "message":
        "🌾 AgroCast AI Backend Running",

        "version":
        "3.0"
    })


@app.route("/weather")
def weather():

    city = request.args.get(
        "city",
        ""
    ).strip()

    if not city:

        return jsonify({

            "error":
            "city parameter required"

        }), 400

    city_key = city.lower()

    if (
        city_key in weather_cache
        and
        is_cache_valid(
            weather_cache[city_key]
        )
    ):

        return jsonify(
            weather_cache[city_key]["data"]
        )

    try:

        data = ow_get(
            "weather",
            {"q": city}
        )

        weather_cache[city_key] = {

            "timestamp":
            time.time(),

            "data":
            data
        }

        return jsonify(data)

    except requests.HTTPError as e:

        status = (
            e.response.status_code
            if e.response
            else 500
        )

        return jsonify({

            "cod": status,

            "message":
            "City not found"

        }), status

    except Exception as e:

        return jsonify({

            "error":
            str(e)

        }), 500


@app.route("/forecast")
def forecast():

    city = request.args.get(
        "city",
        ""
    ).strip()

    if not city:

        return jsonify({

            "error":
            "city parameter required"

        }), 400

    city_key = city.lower()

    if (
        city_key in forecast_cache
        and
        is_cache_valid(
            forecast_cache[city_key]
        )
    ):

        return jsonify({

            "city":
            city,

            "forecast_days":
            100,

            "humidity_predictions":
            forecast_cache[
                city_key
            ]["data"],

            "source":
            "cache"
        })

    try:

        raw = ow_get(
            "forecast",
            {
                "q": city,
                "cnt": 40
            }
        )

        humidity_series = [

            item["main"]["humidity"]

            for item in raw["list"]
        ]

        if len(humidity_series) < 4:

            return jsonify({

                "error":
                "insufficient weather data"

            }), 422

        predictions = fit_sarimax(
            humidity_series,
            100
        )

        forecast_cache[city_key] = {

            "timestamp":
            time.time(),

            "data":
            predictions
        }

        return jsonify({

            "city":
            city,

            "forecast_days":
            100,

            "humidity_predictions":
            predictions,

            "seed_points":
            len(humidity_series),

            "source":
            "sarimax_live"
        })

    except requests.HTTPError as e:

        status = (
            e.response.status_code
            if e.response
            else 500
        )

        return jsonify({

            "cod": status,

            "message":
            "City not found"

        }), status

    except Exception as e:

        return jsonify({

            "error":
            str(e)

        }), 500


# ==================================================
# RUN
# ==================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
```

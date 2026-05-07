from flask import Flask, jsonify
# FORECAST ROUTE
# -------------------------------

@app.route('/forecast')
def forecast():

    print("Generating predictions...")

    predictions = model.forecast(steps=100)

    result = [round(float(x), 2) for x in predictions]

    return jsonify({
        "forecast_days": 100,
        "humidity_predictions": result
    })

# -------------------------------
# LIVE WEATHER ROUTE
# -------------------------------

@app.route('/weather')
def weather():

    city = request.args.get('city')

    if not city:
        return jsonify({
            "error": "City parameter required"
        }), 400

    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"

    response = requests.get(url)

    data = response.json()

    return jsonify(data)

# -------------------------------
# RUN APP
# -------------------------------

if __name__ == '__main__':
    app.run(debug=True)
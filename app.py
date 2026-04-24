from flask import Flask, jsonify, render_template
import joblib
import numpy as np
import pandas as pd
import random
import requests

app = Flask(__name__)

model = joblib.load("models/power_model.pkl")
scaler = joblib.load("models/scaler.pkl")
encoders = joblib.load("models/encoders.pkl")


LAT = 17.3850
LON = 78.4867


def fetch_weather():

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&units=metric&appid={API_KEY}"

    response = requests.get(url)
    data = response.json()

    if response.status_code != 200:
        print("Weather API error:", data)
        return {
            "temp": 30,
            "wind": 3,
            "rain": 0
        }

    temp = data["main"]["temp"]
    wind = data["wind"]["speed"]
    rain = data.get("rain", {}).get("1h", 0)

    return {
        "temp": temp,
        "wind": wind,
        "rain": rain
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict")
def predict():

    weather = fetch_weather()

    hourly_predictions = []

    columns = [
        "Circle",
        "Division",
        "SubDivision",
        "Section",
        "Area",
        "CatCode",
        "CatDesc",
        "TotServices",
        "BilledServices",
        "Load"
    ]

    for i in range(24):

        circle = random.choice(encoders["Circle"].classes_)
        division = random.choice(encoders["Division"].classes_)
        subdivision = random.choice(encoders["SubDivision"].classes_)
        section = random.choice(encoders["Section"].classes_)
        area = random.choice(encoders["Area"].classes_)
        catcode = random.choice(encoders["CatCode"].classes_)
        catdesc = random.choice(encoders["CatDesc"].classes_)

        tot_services = random.randint(500,2000)
        billed_services = random.randint(400,tot_services)
        load = random.randint(100,800)

        data = [
            encoders["Circle"].transform([circle])[0],
            encoders["Division"].transform([division])[0],
            encoders["SubDivision"].transform([subdivision])[0],
            encoders["Section"].transform([section])[0],
            encoders["Area"].transform([area])[0],
            encoders["CatCode"].transform([catcode])[0],
            encoders["CatDesc"].transform([catdesc])[0],
            tot_services,
            billed_services,
            load
        ]

        features = pd.DataFrame([data], columns=columns)

        features = scaler.transform(features)

        pred = model.predict(features)[0]

        hourly_predictions.append(round(pred,2))


    prediction = hourly_predictions[0]

    return jsonify({

        "prediction": prediction,
        "hourly": hourly_predictions,

        "temp": weather["temp"],
        "wind": weather["wind"],
        "rain": weather["rain"],

        "deficit": random.choice(["Stable","High Demand","Normal"]),

        "residential": round(prediction*0.45,2),
        "commercial": round(prediction*0.35,2),
        "industrial": round(prediction*0.20,2),

        "res_percent":45,
        "com_percent":35,
        "ind_percent":20

    })


if __name__ == "__main__":
    app.run(debug=True)
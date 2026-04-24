import pandas as pd
import numpy as np
import os
import joblib
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error



df = pd.read_csv("dataset/TG-NPDCL_consumption_detail_commercial_JANUARY-2025.csv")

print("Dataset Loaded:", df.shape)



categorical_cols = [
    "Circle",
    "Division",
    "SubDivision",
    "Section",
    "Area",
    "CatCode",
    "CatDesc"
]

encoders = {}

for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le



features = [
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

X = df[features]

y = df["Units"]



X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)



scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)



model = RandomForestRegressor(
    n_estimators=200,
    max_depth=18,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)



os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/power_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")
joblib.dump(encoders, "models/encoders.pkl")

print("Model saved successfully!")



pred = model.predict(X_test)

print("R2 Score:", r2_score(y_test, pred))
print("MAE:", mean_absolute_error(y_test, pred))
print("RMSE:", np.sqrt(mean_squared_error(y_test, pred)))



os.makedirs("outputs", exist_ok=True)



plt.figure(figsize=(10,5))
plt.plot(y_test.values[:200], label="Actual")
plt.plot(pred[:200], label="Predicted")
plt.legend()
plt.title("Actual vs Predicted Electricity Consumption")
plt.xlabel("Samples")
plt.ylabel("Units")
plt.savefig("outputs/actual_vs_predicted.png", dpi=300, bbox_inches="tight")
plt.close()

print("Saved: outputs/actual_vs_predicted.png")




plt.figure(figsize=(6,6))
plt.scatter(y_test, pred)
plt.xlabel("Actual Units")
plt.ylabel("Predicted Units")
plt.title("Actual vs Predicted Scatter Plot")
plt.savefig("outputs/scatter_actual_vs_predicted.png", dpi=300, bbox_inches="tight")
plt.close()

print("Saved: outputs/scatter_actual_vs_predicted.png")
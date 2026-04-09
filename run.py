from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_bcrypt import Bcrypt
import json
from pymongo import MongoClient
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)
bcrypt = Bcrypt(app)

client = MongoClient("mongodb://localhost:27017/")
db = client["auth_db"]
users = db["users"]
    
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def home():
    return render_template("start.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        if not email or not password:
            return render_template("register.html", error="All fields are required")

        user = users.find_one({"email": email})

        if user and bcrypt.check_password_hash(user["stat"]["password"], password):
            session["user"] = email
            return redirect(url_for("home_screen"))
        else:
            return render_template("test/login.html", error="Invalid email or password")

    return render_template("test/login.html")

@app.route("/home")
def home_screen():
    return render_template("tabs/home/index.html")

@app.route("/forgot")
def forgot():
    return render_template("forgot.html")

@app.route("/index")
def index():
    return render_template("tabs/home/index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        age = request.form["age"]
        calories = request.form["calories"]
        weight = request.form["weight"]
        height = request.form["height"]
        steps = request.form["steps"]

        if users.find_one({"email": email}):
            return render_template("test/register.html", error="User already exists")

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

        stats = {
            "password": hashed_password,
            "age":age, 
            "calories": calories,
            "weight": weight,
            "height": height,
            "steps": steps
        }

        users.insert_one({
            "stat": stats,
            "email": email
        })

        return redirect(url_for("login"))

    return render_template("test/register.html")

@app.route("/maps")
def maps():
    return render_template("tabs/maps/index.html")

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return "No file uploaded"

    file = request.files["file"]

    if file.filename == "":
        return "No selected file"

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    return redirect(url_for("show_map", filename=file.filename))

@app.route("/map/<filename>")
def show_map(filename):
    return render_template("map.html", filename=filename)

@app.route("/data/<filename>")
def data(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify([])

    with open(filepath, "r", encoding="utf-8") as f:
        timeline = json.load(f)

    heatmap_points = []

    for obj in timeline.get("timelineObjects", []):
        if "placeVisit" in obj:
            loc = obj["placeVisit"]["location"]
            lat = loc["latitudeE7"] / 1e7
            lng = loc["longitudeE7"] / 1e7
            heatmap_points.append([lat, lng, 1])
        if "activitySegment" in obj:
            end_loc = obj["activitySegment"]["endLocation"]
            lat = end_loc["latitudeE7"] / 1e7
            lng = end_loc["longitudeE7"] / 1e7
            heatmap_points.append([lat, lng, 0.5])

    return jsonify(heatmap_points)

@app.route("/stats")
def stats():
    return render_template("tabs/stats/index.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(host='localhost', port=5000, debug=True)

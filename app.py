from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

app = Flask(__name__)

# Development-only secret key.
# Change this before any real deployment.
app.secret_key = "lifelinex-development-secret-key"

DATABASE = "lifelinex.db"


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def init_db():
    conn = get_db()

    # -----------------------------------------------------
    # USERS
    # -----------------------------------------------------

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            student_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)

    # -----------------------------------------------------
    # EMERGENCY PROFILES
    # -----------------------------------------------------

    conn.execute("""
        CREATE TABLE IF NOT EXISTS emergency_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            blood_group TEXT NOT NULL,
            emergency_alerts INTEGER NOT NULL DEFAULT 0,
            location_sharing INTEGER NOT NULL DEFAULT 0,
            availability INTEGER NOT NULL DEFAULT 0,
            latitude REAL,
            longitude REAL,
            location_updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Upgrade an older database if these columns do not exist.
    columns = {
        row["name"]
        for row in conn.execute(
            "PRAGMA table_info(emergency_profiles)"
        ).fetchall()
    }

    if "latitude" not in columns:
        conn.execute(
            "ALTER TABLE emergency_profiles ADD COLUMN latitude REAL"
        )

    if "longitude" not in columns:
        conn.execute(
            "ALTER TABLE emergency_profiles ADD COLUMN longitude REAL"
        )

    if "location_updated_at" not in columns:
        conn.execute(
            "ALTER TABLE emergency_profiles ADD COLUMN location_updated_at TEXT"
        )

    # -----------------------------------------------------
    # EMERGENCY REQUESTS
    # -----------------------------------------------------

    conn.execute("""
        CREATE TABLE IF NOT EXISTS emergency_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            emergency_type TEXT NOT NULL,
            required_blood_group TEXT,
            units INTEGER,
            resource_name TEXT,
            resource_quantity INTEGER,
            urgency TEXT NOT NULL,
            description TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


# =========================================================
# HOME
# =========================================================

@app.route("/")
def landing_page():
    return render_template("index.html")


# =========================================================
# REGISTER
# =========================================================

@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form.get("name", "").strip()
        student_id = request.form.get("student_id", "").strip()
        email = request.form.get("email", "").strip().lower()
        phone = request.form.get("phone", "").strip()
        password = request.form.get("password", "")

        if not name or not student_id or not email or not phone or not password:
            return render_template(
                "register.html",
                error="Please fill in all fields."
            )

        hashed_password = generate_password_hash(password)

        try:
            conn = get_db()

            conn.execute("""
                INSERT INTO users
                (name, student_id, email, phone, password)
                VALUES (?, ?, ?, ?, ?)
            """, (
                name,
                student_id,
                email,
                phone,
                hashed_password
            ))

            conn.commit()
            conn.close()

            return redirect(url_for("login"))

        except sqlite3.IntegrityError:
            return render_template(
                "register.html",
                error="Student ID or email is already registered."
            )

    return render_template("register.html")


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        conn = get_db()

        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        conn.close()

        if user and check_password_hash(user["password"], password):

            session["user_id"] = user["id"]
            session["user_name"] = user["name"]

            return redirect(url_for("dashboard"))

        return render_template(
            "login.html",
            error="Invalid email or password."
        )

    return render_template("login.html")


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = get_db()

    profile = conn.execute(
        """
        SELECT *
        FROM emergency_profiles
        WHERE user_id = ?
        """,
        (session["user_id"],)
    ).fetchone()

    conn.close()

    return render_template(
        "dashboard.html",
        user_name=session["user_name"],
        profile=profile
    )


# =========================================================
# EMERGENCY PROFILE
# =========================================================

@app.route("/profile", methods=["GET", "POST"])
def profile():

    if "user_id" not in session:
        return redirect(url_for("login"))

    user_id = session["user_id"]

    if request.method == "POST":

        blood_group = request.form.get("blood_group", "").strip()

        try:
            emergency_alerts = int(
                request.form.get("emergency_alerts", "0")
            )
            location_sharing = int(
                request.form.get("location_sharing", "0")
            )
            availability = int(
                request.form.get("availability", "0")
            )
        except ValueError:
            return render_template(
                "profile.html",
                profile=None,
                error="Invalid profile settings."
            )

        allowed_blood_groups = {
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
        }

        if blood_group not in allowed_blood_groups:
            return render_template(
                "profile.html",
                profile=None,
                error="Please select a valid blood group."
            )

        conn = get_db()

        existing_profile = conn.execute(
            """
            SELECT id
            FROM emergency_profiles
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchone()

        if existing_profile:

            conn.execute(
                """
                UPDATE emergency_profiles
                SET
                    blood_group = ?,
                    emergency_alerts = ?,
                    location_sharing = ?,
                    availability = ?
                WHERE user_id = ?
                """,
                (
                    blood_group,
                    emergency_alerts,
                    location_sharing,
                    availability,
                    user_id
                )
            )

        else:

            conn.execute(
                """
                INSERT INTO emergency_profiles
                (
                    user_id,
                    blood_group,
                    emergency_alerts,
                    location_sharing,
                    availability
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    blood_group,
                    emergency_alerts,
                    location_sharing,
                    availability
                )
            )

        conn.commit()
        conn.close()

        return redirect(url_for("dashboard"))

    conn = get_db()

    profile_data = conn.execute(
        """
        SELECT *
        FROM emergency_profiles
        WHERE user_id = ?
        """,
        (user_id,)
    ).fetchone()

    conn.close()

    return render_template(
        "profile.html",
        profile=profile_data,
        error=None
    )


# =========================================================
# UPDATE CURRENT LOCATION
# =========================================================

@app.route("/api/location", methods=["POST"])
def update_location():

    if "user_id" not in session:
        return {
            "success": False,
            "message": "Please log in first."
        }, 401

    data = request.get_json(silent=True) or {}

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return {
            "success": False,
            "message": "Latitude and longitude are required."
        }, 400

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Invalid coordinates."
        }, 400

    if not (-90 <= latitude <= 90):
        return {
            "success": False,
            "message": "Invalid latitude."
        }, 400

    if not (-180 <= longitude <= 180):
        return {
            "success": False,
            "message": "Invalid longitude."
        }, 400

    conn = get_db()

    profile = conn.execute(
        """
        SELECT location_sharing
        FROM emergency_profiles
        WHERE user_id = ?
        """,
        (session["user_id"],)
    ).fetchone()

    if not profile:
        conn.close()

        return {
            "success": False,
            "message": "Please create your emergency profile first."
        }, 400

    if not profile["location_sharing"]:
        conn.close()

        return {
            "success": False,
            "message": "Location sharing is disabled in your emergency profile."
        }, 403

    updated_at = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        UPDATE emergency_profiles
        SET
            latitude = ?,
            longitude = ?,
            location_updated_at = ?
        WHERE user_id = ?
        """,
        (
            latitude,
            longitude,
            updated_at,
            session["user_id"]
        )
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Location updated successfully.",
        "latitude": latitude,
        "longitude": longitude,
        "updated_at": updated_at
    }


# =========================================================
# EMERGENCY REQUEST
# =========================================================

@app.route("/emergency", methods=["GET", "POST"])
def emergency():

    if "user_id" not in session:
        return redirect(url_for("login"))

    if request.method == "POST":

        emergency_type = request.form.get(
            "emergency_type", ""
        ).strip()

        required_blood_group = request.form.get(
            "required_blood_group", ""
        ).strip()

        units_raw = request.form.get(
            "units", ""
        ).strip()

        resource_name = request.form.get(
            "resource_name", ""
        ).strip()

        resource_quantity_raw = request.form.get(
            "resource_quantity", ""
        ).strip()

        urgency = request.form.get(
            "urgency", ""
        ).strip()

        description = request.form.get(
            "description", ""
        ).strip()

        latitude_raw = request.form.get(
            "latitude", ""
        ).strip()

        longitude_raw = request.form.get(
            "longitude", ""
        ).strip()

        # -------------------------------------------------
        # BASIC VALIDATION
        # -------------------------------------------------

        if emergency_type not in {"blood", "medical"}:
            return render_template(
                "emergency.html",
                error="Please select a valid emergency type."
            )

        if urgency not in {"critical", "high", "normal"}:
            return render_template(
                "emergency.html",
                error="Please select a valid urgency level."
            )

        if not description:
            return render_template(
                "emergency.html",
                error="Please provide a short description."
            )

        # -------------------------------------------------
        # BLOOD REQUEST
        # -------------------------------------------------

        if emergency_type == "blood":

            allowed_blood_groups = {
                "A+", "A-",
                "B+", "B-",
                "AB+", "AB-",
                "O+", "O-"
            }

            if required_blood_group not in allowed_blood_groups:
                return render_template(
                    "emergency.html",
                    error="Please select a valid blood group."
                )

            try:
                units = int(units_raw)
            except ValueError:
                return render_template(
                    "emergency.html",
                    error="Please enter a valid number of blood units."
                )

            if units < 1 or units > 20:
                return render_template(
                    "emergency.html",
                    error="Blood units must be between 1 and 20."
                )

            resource_name = None
            resource_quantity = None

        # -------------------------------------------------
        # MEDICAL RESOURCE REQUEST
        # -------------------------------------------------

        else:

            if not resource_name:
                return render_template(
                    "emergency.html",
                    error="Please enter the required medical resource."
                )

            try:
                resource_quantity = int(resource_quantity_raw)
            except ValueError:
                return render_template(
                    "emergency.html",
                    error="Please enter a valid quantity."
                )

            if resource_quantity < 1 or resource_quantity > 100:
                return render_template(
                    "emergency.html",
                    error="Quantity must be between 1 and 100."
                )

            required_blood_group = None
            units = None

        # -------------------------------------------------
        # EMERGENCY LOCATION
        # -------------------------------------------------

        try:
            latitude = float(latitude_raw)
            longitude = float(longitude_raw)
        except (TypeError, ValueError):
            return render_template(
                "emergency.html",
                error="Please capture the emergency location first."
            )

        if not (-90 <= latitude <= 90):
            return render_template(
                "emergency.html",
                error="Invalid latitude."
            )

        if not (-180 <= longitude <= 180):
            return render_template(
                "emergency.html",
                error="Invalid longitude."
            )

        # -------------------------------------------------
        # SAVE EMERGENCY REQUEST
        # -------------------------------------------------

        created_at = datetime.now(timezone.utc).isoformat()

        conn = get_db()

        conn.execute(
            """
            INSERT INTO emergency_requests
            (
                user_id,
                emergency_type,
                required_blood_group,
                units,
                resource_name,
                resource_quantity,
                urgency,
                description,
                latitude,
                longitude,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["user_id"],
                emergency_type,
                required_blood_group,
                units,
                resource_name,
                resource_quantity,
                urgency,
                description,
                latitude,
                longitude,
                "PENDING",
                created_at
            )
        )

        conn.commit()
        conn.close()

        return redirect(url_for("dashboard"))

    return render_template(
        "emergency.html",
        error=None
    )


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("landing_page"))


# =========================================================
# START APPLICATION
# =========================================================

if __name__ == "__main__":
    init_db()

    app.run(
        debug=True,
        port=5000
    )
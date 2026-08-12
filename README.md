# LifelineX — Phase 1

Campus Emergency Blood & Medical Assistance Network (hackathon prototype)

## What's in Phase 1

- A running Flask backend (`app.py`)
- One route (`/`) that serves the landing page
- A designed landing page (`templates/index.html` + `static/css/style.css`)
- No database, login, or forms yet — that starts in Phase 2

## Folder structure

```
lifelinex/
├── app.py                 <- Flask app, starts the server
├── requirements.txt       <- Python packages this project needs
├── templates/
│   └── index.html         <- the landing page
└── static/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js
    └── images/             <- empty for now, used in later phases
```

Flask has a rule: it automatically looks for HTML pages inside a folder
named `templates/`, and CSS/JS/images inside a folder named `static/`.
That's why the folders must be named exactly that.

## How to run this on Windows

### 1. Install Python
Download Python from https://www.python.org/downloads/ (3.11 or newer).
**Important:** during install, check the box that says **"Add Python to PATH"**.

Confirm it worked — open **Command Prompt** (search "cmd" in the Start menu) and run:
```
python --version
```
You should see something like `Python 3.12.x`.

### 2. Put the project folder somewhere easy to find
Example: `C:\Users\<you>\Desktop\lifelinex`

### 3. Open a terminal in that folder
In File Explorer, open the `lifelinex` folder, click the address bar, type `cmd`, press Enter.
This opens Command Prompt already inside the right folder.

### 4. Create a virtual environment
A virtual environment is a private, isolated copy of Python just for this
project, so the packages we install don't clash with anything else on your
computer.
```
python -m venv venv
```

### 5. Activate it
```
venv\Scripts\activate
```
You'll know it worked because your prompt will now start with `(venv)`.

### 6. Install the project's dependencies
```
pip install -r requirements.txt
```
This reads `requirements.txt` and installs Flask.

### 7. Run the server
```
python app.py
```
You should see output ending in something like:
```
Running on http://127.0.0.1:5000
```

### 8. Open it in your browser
Go to: **http://127.0.0.1:5000**

You should see the LifelineX landing page.

### To stop the server
Press `Ctrl + C` in the terminal.

### Next time you open the project
You only need steps 5, 7, 8 (activate the venv, run the app, open the browser) —
steps 1, 4, and 6 are one-time setup.

---

## What each piece does (beginner notes)

- **Flask** is a Python web framework — it lets a Python program act as a
  web server that responds to browser requests. In LifelineX, Flask will
  eventually handle registration, emergency requests, matching, and the
  admin dashboard as JSON APIs.
- **`render_template`** tells Flask "take this HTML file from the
  `templates` folder and send it to the browser."
- **`url_for('static', filename=...)`** is how HTML files safely reference
  CSS/JS files without hardcoding paths — Flask builds the correct URL for you.
- **Virtual environment (`venv`)** keeps this project's Python packages
  separate from other projects on your machine.

## Design notes

The landing page uses a small custom design system rather than a generic
template:
- **Colors:** deep ink (`#0E1420`) for text/nav, a cool clinical paper
  background (`#F2F4F2`), a signal red (`#D62839`) for emergency/urgency
  cues, and a pulse teal (`#12877F`) for the "trusted network" side of the
  product.
- **Type:** Space Grotesk for headlines (technical, network feel), Inter
  for body text, JetBrains Mono for small labels/data (eyebrows, stats).
- **Signature visual:** an animated EKG pulse line that resolves into a
  small network of connected nodes — representing the heartbeat of an
  emergency turning into a coordinated response from nearby students.

## What's NOT here yet (comes in later phases)

- Database / SQLite
- Registration & login
- Emergency request form
- Location + distance matching
- Notifications
- Admin dashboard
- Map
- Demo mode

## Confirm before moving on

Please run the steps above and confirm:
1. `python app.py` starts without errors
2. http://127.0.0.1:5000 shows the landing page correctly (nav, hero
   with the pulse animation, "how it works" steps, features, safety
   section, footer)

Once you confirm this works, we'll move to **Phase 2: Registration + Emergency Profile**.

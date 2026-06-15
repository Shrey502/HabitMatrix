# HabitMatrix 🚀
**A High-Friction, Biometric Habit Tracker & Time-Boxing OS**

Traditional habit trackers fail because they are passive. They rely on finite willpower to check boxes. **HabitMatrix** is different. It is an active, gamified telemetry system designed to bridge the gap between abstract long-term goals and raw daily execution. It enforces intentional, high-friction micro-actions to break the cycle of passive scrolling and force cognitive engagement before a task begins.

Built with **Next.js 16**, **FastAPI**, and **MongoDB**, it enforces strict mathematical time-boxing, generates 3D spatial audio to induce flow states, and explicitly correlates your biometric data (mood & energy) with your physical output.

---

## ⚡ Features

### 🕒 The Time-Boxer & Collision Engine
A 24-hour drag-and-drop vertical timeline designed for strict execution. 
* **Dynamic Scaling:** Tasks visually stretch based on their duration.
* **Collision Resolution:** If you drop a new task on top of an existing one, the engine automatically calculates the intersection, intercepts the drop, and offers to split the interrupted task—saving the completed portion and spawning a new task for the remainder.

### 🧠 Focus Deck Pro (Web Audio API Engine)
A built-in 3D ambient audio synthesizer to hack your focus state.
* **Binaural Beats:** Bypasses audio files to generate raw 40Hz Gamma waves directly in the browser via dual `OscillatorNodes`, inducing deep focus.
* **3D Spatial Audio:** Calculates sine/cosine trigonometry via `requestAnimationFrame` to map ambient sounds (Rain, Space, Cafe) onto `PannerNodes`, making the sound physically orbit your head.
* **Auto-Pomodoro:** Built-in execution timer that silences the `GainNodes` upon completion.

### 📊 Biometric Telemetry & The Yearly Grid
You cannot improve what you do not measure.
* **Captain's Log:** A daily journal that records qualitative biometric data (Mood, Energy, Tags).
* **The Glowing Dot Matrix:** A 365-day SVG heatmap that pulses based on your execution volume.
* **Data Correlation:** Clicking any historical dot merges your task output with your Captain's Log entry for that specific day, revealing exactly what biological and environmental parameters produce your highest output.

### 🧠 Cognitive Onboarding & Dynamic Weekly Planning
* **Biological Calibration:** Upon first login, the system calibrates to your Chronotype (Biological Peak Velocity), Burnout thresholds, and primary Time Leaks.
* **Dynamic Weekoffs:** Define your specific corporate or school weekoffs. The engine automatically calculates your personal "Start of Week" (i.e., `last day of weekoff + 1`).
* **Intelligent Auto-Deployment:** At the start of your custom week, the system runs a background calculation, automatically stripping "Work/School" tasks from your weekoff days and deploying your active routines for the next 7 days.
* **Surgical Weekly Reviews:** A "Weekly Check-in" modal appears exactly on your start-of-week day. This allows you to review and tweak the auto-generated tasks for the current week only, leaving your master routine templates completely untouched.

### 🕸️ Mind Map & The Armory
* **Interactive Canvas:** A drag-and-drop visual node network to map high-level macro goals to micro-habits.
* **The Armory (Macro Deployment):** Save clusters of tasks as "Protocols" (e.g., *Morning Routine*). Bind them to specific repeat days, or "Pause" them globally without losing your configurations.

---

## 🛠️ Tech Stack
* **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, HTML5 Web Audio API
* **Backend:** Python FastAPI, Motor (Async MongoDB), Pydantic
* **Database:** MongoDB
* **Integrations:** Google Calendar Events API (OAuth2)

## 🚀 Getting Started

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
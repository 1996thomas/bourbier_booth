@AGENTS.md
# BOURBIER MIRROR - PROJECT CONTEXT

## 1. PROJECT GOAL

Build a physical interactive installation called "Bourbier Mirror".

It is a web application displayed on a CRT screen inside a pop-up store.

Users see themselves via a webcam with retro-style UI overlays (PS2 menus, MSN, early internet aesthetics).

They can switch scenes and capture a photo formatted for Instagram Stories (9:16).

---

## 2. DEPLOYMENT ARCHITECTURE

This is a hosted web application.

- The Next.js app is deployed online (Vercel or similar)
- The Raspberry Pi ONLY acts as a display device
- It opens the hosted URL in Chromium kiosk mode

Example:
https://mirror.bourbier.com

Raspberry role:
- purely a browser client
- no local backend
- no local logic

---

## 3. ACCESS CONTROL

The app must NOT be publicly accessible.

Use a simple protection system:

- either a login page (/login)
- OR a secret URL token (preferred for simplicity)

Example:
https://mirror.bourbier.com?token=bourbier2026

Security goal:
prevent public access, not enterprise-grade security.

---

## 4. USER FLOW

1. User approaches the screen
2. Webcam shows live mirror
3. User switches scenes (UI overlays)
4. User interacts via controller
5. User captures image
6. Image is generated (story format)
7. QR code allows download on phone

---

## 5. HARDWARE CONTEXT

- Raspberry Pi (kiosk display only)
- CRT monitor (4:3)
- USB webcam
- Input device: gamepad or arcade buttons

No keyboard, no mouse, no touch UI in production.

---

## 6. CORE FEATURES (MVP FIRST)

MVP priority:

1. Webcam live feed
2. Scene system (switchable overlays)
3. Input controls (keyboard/gamepad)
4. Capture image (webcam + overlay → PNG)

Later:
- QR download system
- Upload backend
- Admin mode

---

## 7. ARCHITECTURE RULES

Keep everything extremely simple.

Allowed structure:

/app/mirror
/components
/lib
/hooks

Rules:
- No Redux
- No complex state machines
- No over-engineering
- Prefer React state only

---

## 8. SCENE SYSTEM

Scenes are React components rendered as overlays.

Examples:
- PS2 character select UI
- MSN chat UI
- Default mirror mode

Scene switching must be:
- simple
- state-based (enum or array)

---

## 9. INPUT CONTROLS

Mapping:

- ArrowRight → next scene
- ArrowLeft → previous scene
- Space / Button A → capture

Must support:
- keyboard
- gamepad API

---

## 10. CAPTURE SYSTEM

Capture process:

- Take snapshot of webcam + UI overlay
- Export as PNG (9:16 format)
- Store locally or prepare for upload later

No complex image processing in MVP.

---

## 11. PERFORMANCE RULES

Must run smoothly on Raspberry Pi:

- avoid heavy libraries
- avoid animations overload
- prefer CSS over JS animations
- keep render logic minimal

---

## 12. DEVELOPMENT PRIORITY

Strict order:

1. Webcam works
2. Scene system works
3. Input works
4. Capture works
5. UI polish

Never start with design.

---

## 13. NON-GOALS

Do NOT build:
- authentication systems complex
- backend architecture
- database layer
- reusable enterprise abstractions

This is a physical installation MVP, not a SaaS product.

---

## 14. MINDSET

Clarity > abstraction  
Functionality > perfection  
MVP > scalability
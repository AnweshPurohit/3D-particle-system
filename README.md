# Interactive 3D Particle System

A sophisticated web-based 3D particle simulation that responds to hand gestures in real-time. This project combines high-performance graphics with advanced computer vision to create an immersive, interactive experience.

## 🚀 Features

- **Real-time 3D Rendering**: Fluid particle simulations using Three.js.
- **Hand Gesture Control**: Experience touch-free interaction via webcam using MediaPipe.
- **Dynamic Formations**: Switch between various complex 3D shapes (Heart, Flower, Saturn, Milky Way, etc.) based on hand poses.
- **Interactive Manipulation**: Pinch to expand or contract the particle systems, and move your hand to alter colors dynamically.
- **Dual-Hand Support**: Smoothly transitions to dual particle systems when both hands are detected.

## 🛠️ Technology Stack

- **[Three.js](https://threejs.org/)**: For the 3D graphics engine and particle systems.
- **[MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)**: For robust, low-latency hand landmark detection.
- **Vanilla JavaScript/HTML/CSS**: For the core logic and sleek, modern UI.

## 🖐️ Gesture Guide

Interact with the system using the following gestures:

| Gesture | formation / Action |
| :--- | :--- |
| 🖐️ **Open Hand (5 Fingers)** | Fireworks Formation |
| ☝️ **1 Finger** | Heart Formation |
| ✌️ **2 Fingers** | Flower Formation |
| 🤟 **3 Fingers** | Saturn Formation |
| 🖖 **4 Fingers** | Milky Way Formation |
| 🤏 **Pinch** | Expand / Contract System |
| ✋ **Move Left/Right** | Change Particle Colors |

## 🏁 Getting Started

1.  Clone the repository.
2.  Open `index.html` in a modern web browser.
3.  Grant camera permissions when prompted.
4.  Use the **Gestures** button to view the instruction overlay and start interacting!

---
*Created with passion for interactive web technologies.*

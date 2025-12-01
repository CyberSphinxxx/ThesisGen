# ThesisGen

A production-grade, single-file React application for thesis management, powered by AI and Cloud Sync.

## Features

- **AI-Powered**: Uses Google Gemini for concept generation, source analysis, and text expansion.
- **Cloud Sync**: Real-time data persistence with Firebase Firestore.
- **Cost Control**: Built-in credit system to manage API usage (5 generations/hour).
- **Titanium Academic Theme**: sleek dark mode design.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```

3.  **Configuration**:
    - On first load, you will be asked for **Firebase Config** and **Gemini API Key**.
    - You can also use **Demo Mode** to explore without keys.

## Tech Stack

- React (Vite)
- Tailwind CSS (v4)
- Firebase (Auth + Firestore)
- Google Gemini API
- Lucide React Icons
- Recharts

# Vercel Deployment Guide

This guide explains how to deploy **ThesisGen** to Vercel.

## Prerequisites

*   A [Vercel Account](https://vercel.com/).
*   The project pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Steps

1.  **Import Project**:
    *   Go to your Vercel Dashboard.
    *   Click **"Add New..."** -> **"Project"**.
    *   Import your `ThesisGen` repository.

2.  **Configure Project**:
    *   **Framework Preset**: Vercel should automatically detect **Vite**.
    *   **Root Directory**: Ensure it points to the root of your Vite app (where `package.json` is). If your repo *is* the folder, leave it as `./`.

3.  **Environment Variables (CRITICAL)**:
    *   Expand the **"Environment Variables"** section.
    *   You must add the following variables (copy them from your local `.env` file):

    | Key | Value Description |
    | :--- | :--- |
    | `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
    | `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
    | `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
    | `VITE_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket |
    | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID |
    | `VITE_FIREBASE_APP_ID` | Your Firebase App ID |
    | `VITE_FIREBASE_MEASUREMENT_ID` | Your Firebase Measurement ID |
    | `VITE_GEMINI_API_KEY` | Your Gemini API Key |

4.  **Deploy**:
    *   Click **"Deploy"**.
    *   Vercel will build your project and assign a domain (e.g., `thesis-nexus-cloud.vercel.app`).

## Troubleshooting

*   **404 on Refresh**: If you get 404 errors when refreshing pages, ensure the `vercel.json` file is present in your repository root. It handles the Single Page Application (SPA) routing.
*   **Firebase/Gemini Errors**: Double-check that all environment variables are pasted correctly in the Vercel dashboard. They must start with `VITE_`.

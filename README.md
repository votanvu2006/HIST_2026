# HeritageXR

An interactive museum web demo for exploring selected Dong Son artifacts through 3D scenes, exhibit information, short stories, quizzes, and an AI guide.

## Live Demo

| Resource | URL |
|---|---|
| Website | https://heritagexr.vercel.app/ |
| Admin center | https://heritagexr.vercel.app/admin |
| RAG Studio | https://heritagexr.vercel.app/admin/studio |
| Backend health check | https://hist-2026-zi6p.vercel.app/api/health |

The visitor interface is currently in Vietnamese. This README is written in English.

## Project Overview

HeritageXR demonstrates how a museum visitor might explore an exhibit on the web. Visitors can select an artifact, inspect its 3D representation, read background information, watch available story or crafting media, answer a quiz, and ask the AI guide questions about the selected artifact.

The current demo includes:

- **Ngoc Lu Bronze Drum** — Trống đồng Ngọc Lũ
- **Dao Thinh Bronze Container** — Thạp đồng Đào Thịnh
- **Dong Son Bronze Dagger** — Dao găm đồng Đông Sơn

The 3D scenes use interactive demo models and hotspots. The current prototype does not automatically recognize physical museum objects with computer vision, and its 3D models are not precision scans of the original artifacts. Camera passthrough is an optional browser feature.

## Features

- Interactive 3D exhibit scenes built with Three.js.
- Exhibit information with references shown in the visitor experience.
- Story and crafting media when the corresponding assets are available.
- A quiz with demo points saved in the visitor's browser.
- An AI guide that answers questions using the project's exhibit corpus and returns source citations.
- Admin center and RAG Studio pages for authorized project use.
- Voice input through the backend transcription endpoint, subject to browser microphone permission and AI service configuration.
- Responsive, dark museum-style interface.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| 3D experience | Three.js |
| Backend API | Python, FastAPI |
| AI and embeddings | Google Gemini |
| Local vector index | ChromaDB |
| Hosting | Vercel |

## Architecture

The frontend sends API requests to the same-origin `/api` path. In production, the frontend Vercel project rewrites these requests to the separate FastAPI backend project.

The backend loads the checked exhibit corpus from `backend/data/corpus.json`. For local development, it can create a persistent ChromaDB index under the backend storage directory. On Vercel, serverless mode uses the bundled corpus and avoids relying on a persistent local vector database.

~~~text
Visitor browser
    ├── HeritageXR frontend (React / Vite / Three.js)
    └── /api requests
          └── Vercel rewrite
                └── FastAPI backend
                      ├── Exhibit corpus and source citations
                      └── Gemini chat, embeddings, and transcription
~~~

## Repository Structure

~~~text
HeritageXR/
├── frontend/
│   ├── public/videos/       # Story and crafting media
│   ├── src/                 # React application and 3D scenes
│   ├── vercel.json          # API and frontend route rewrites
│   └── package.json
├── backend/
│   ├── app/                 # FastAPI application, RAG, and configuration
│   ├── data/corpus.json     # Exhibit knowledge corpus
│   ├── scripts/ingest.py    # Local ChromaDB indexing
│   ├── requirements.txt
│   └── main.py              # Vercel FastAPI entry point
├── Start-Demo.ps1           # Optional Windows demo launcher
└── start-demo.cmd
~~~

## Prerequisites

- Python and pip, compatible with the pinned packages in `backend/requirements.txt`.
- Node.js and npm, compatible with the Vite version in `frontend/package.json`.
- A Google Gemini API key for AI chat, embeddings, and voice transcription.

## Run Locally

### 1. Clone the repository

~~~bash
git clone https://github.com/votanvu2006/HeritageXR.git
cd HeritageXR
~~~

### 2. Configure the backend

Create a Python virtual environment and install the backend dependencies.

**Windows PowerShell**

~~~powershell
py -m venv .venv
.venv/Scripts/Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
~~~

**macOS or Linux**

~~~bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
~~~

Open `backend/.env` and set `GEMINI_API_KEY`. Set a private `ADMIN_TOKEN` if you want to use the protected admin pages locally.

### 3. Build the local knowledge index

From the repository root, run:

~~~bash
cd backend
python scripts/ingest.py
~~~

This uses the Gemini embedding service and creates the local ChromaDB index. Run ingestion again after changing the corpus.

### 4. Start the backend

Keep the terminal in the `backend` directory and run:

~~~bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

The local health endpoint is:

~~~text
http://127.0.0.1:8000/api/health
~~~

### 5. Start the frontend

Open a second terminal at the repository root:

~~~bash
cd frontend
npm ci
npm run dev
~~~

Open the Vite address printed in the terminal, usually `http://localhost:5173`. Vite proxies `/api` requests to `http://127.0.0.1:8000` by default.

### Optional Windows launcher

After configuring `backend/.env`, Windows users can run `start-demo.cmd` from the repository root. The launcher installs missing dependencies, starts both services, indexes the corpus if needed, and opens the local website.

## Environment Variables

The backend reads its local configuration from `backend/.env`. Never commit this file or publish its secret values.

| Variable | Purpose | Default or requirement |
|---|---|---|
| `GEMINI_API_KEY` | Authenticates Gemini requests | Required for AI features |
| `GEMINI_MODEL` | Main chat model | `gemini-3.5-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | Fallback chat model | `gemini-3.1-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Creates document and query embeddings | `gemini-embedding-001` |
| `GEMINI_TRANSCRIPTION_MODEL` | Transcribes voice input | Uses `GEMINI_MODEL` if unset |
| `ADMIN_TOKEN` | Protects admin API endpoints | Set a private value for stable admin access |
| `ALLOWED_ORIGINS` | Allowed browser origins for the API | Localhost origins in `.env.example` |

The backend also supports `HERITAGE_STORAGE` to select its storage directory. For local use, the default is `backend/storage`.

## Deploy on Vercel

The application uses two Vercel projects connected to this repository:

| Project | Root directory | Purpose |
|---|---|---|
| `heritagexr` | `frontend` | React website |
| `hist-2026-zi6p` | `backend` | FastAPI API |

### Frontend project

- Set the Root Directory to `frontend`.
- The checked-in `frontend/vercel.json` sends requests under `/api/*` to `https://hist-2026-zi6p.vercel.app/api/*` and rewrites other paths to the React app. This also supports routes such as `/admin` and `/admin/studio`.
- The frontend uses relative `/api` requests by default; `VITE_API_BASE_URL` is not required for this rewrite setup.

### Backend project

- Set the Root Directory to `backend`.
- Add these environment variables for the **Production** environment:

~~~text
GEMINI_API_KEY=<your Gemini API key>
ADMIN_TOKEN=<a long private random value>
HERITAGE_SERVERLESS=1
HERITAGE_STORAGE=/tmp/heritagexr
ALLOWED_ORIGINS=https://heritagexr.vercel.app
~~~

Set `GEMINI_API_KEY` and `ADMIN_TOKEN` as secrets in Vercel. Do not put either value in this README, frontend variables, or source code.

`HERITAGE_SERVERLESS=1` enables the backend's serverless storage and retrieval path. `HERITAGE_STORAGE=/tmp/heritagexr` directs temporary runtime files to writable temporary storage. Data written to temporary serverless storage is not a permanent database.

After changing environment variables, redeploy the backend. If the backend domain changes, update the API destination in `frontend/vercel.json`, then redeploy the frontend.

## Verify the Deployment

1. Open the website and select an exhibit.
2. Open the backend health endpoint: https://hist-2026-zi6p.vercel.app/api/health
3. Check that the response reports `status` as `ready`, `index_ready` as `true`, and `api_key_configured` as `true`.
4. Ask the AI guide a question about the selected exhibit and check that the response includes citations.

If the website loads but the AI guide does not respond, check the backend health response and the backend project's Vercel runtime logs. Confirm that the production environment variables are set and that the latest backend deployment includes them.

## API Endpoints

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/health` | Backend readiness and corpus status | Public |
| `POST` | `/api/chat` | Ask the visitor AI guide a question | Public |
| `POST` | `/api/transcribe` | Convert an uploaded voice recording to text | Public |
| `POST` | `/api/admin/chat` | Test a question and inspect RAG diagnostics | Bearer token |
| `GET` | `/api/admin/corpus` | Read corpus data and sources | Bearer token |
| `GET` | `/api/admin/metrics` | Read chatbot request metrics | Bearer token |

Admin requests use the `Authorization: Bearer <ADMIN_TOKEN>` header. Interactive API documentation is disabled in the deployed backend.

## Available Frontend Commands

Run these commands from the `frontend` directory.

~~~bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and build the production frontend
npm run lint     # Run Oxlint
npm run preview  # Preview the production build locally
~~~

## Notes and Limitations

- The visitor interface and exhibit content are currently primarily in Vietnamese.
- The 3D objects are interactive demo representations, not verified digital scans.
- The current prototype uses hotspots for selection; it does not automatically identify real artifacts through computer vision.
- AI answers are limited to the included exhibit corpus. The guide may say that evidence is insufficient when the corpus does not support a claim.
- Vercel serverless temporary storage should not be treated as durable storage for metrics, logs, or user data.
- Keep API keys and admin credentials on the backend. Never use a `VITE_` variable for a secret because frontend variables are included in the browser bundle.

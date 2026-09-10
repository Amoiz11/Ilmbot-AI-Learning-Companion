# 🤖 IlmBot — AI-Powered Learning Companion

<p align="center">
  <a href="https://ilmbot-ai-learning-companion.vercel.app">
    <img src="https://img.shields.io/badge/Live%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live App" />
  </a>
  <a href="https://ilmbot-ai-learning-companion-production.up.railway.app/docs">
    <img src="https://img.shields.io/badge/API%20Docs-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="API Docs" />
  </a>
  <img src="https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector" />
</p>

> **IlmBot** (from Arabic: عِلْم, meaning *"knowledge"*) is a high-performance, full-stack AI learning companion designed to empower students and developers. It combines intelligent multi-turn academic tutoring, a dedicated programming coach, active recall smart revision tools (quizzes & flashcards), and document-grounded multimodal RAG — engineered with enterprise-grade modular architecture.

---

## 🌐 Live Access

| Service | URL | Status |
| :--- | :--- | :--- |
| **Production Web App** | [ilmbot-ai-learning-companion.vercel.app](https://ilmbot-ai-learning-companion.vercel.app) | 🟢 Live |
| **Production Backend API** | [ilmbot-ai-learning-companion-production.up.railway.app](https://ilmbot-ai-learning-companion-production.up.railway.app) | 🟢 Live |
| **Interactive API Swagger Docs** | [API Documentation (/docs)](https://ilmbot-ai-learning-companion-production.up.railway.app/docs) | 🟢 Active |
| **GitHub Source Code** | [Amoiz11/Ilmbot-AI-Learning-Companion](https://github.com/Amoiz11/Ilmbot-AI-Learning-Companion) | 🟢 Verified |

---

## ✨ Features

### 🧠 Learning Coach
- Multi-turn conversational AI tutor powered by Groq LLMs
- LaTeX / KaTeX math rendering for STEM subjects
- Markdown-rich responses with syntax-highlighted code blocks
- Conversation history with auto-generated titles
- Voice input via Web Speech API

### 💻 Coding Coach
- Dedicated coding assistant with language-aware prompts
- Code execution guidance and debugging help
- Syntax-highlighted code output

### 📝 Smart Revision
- AI-generated **quizzes** (MCQ, True/False, Short Answer)
- AI-generated **flashcard** decks from any topic
- Spaced repetition-style review sessions
- Export revision packs to **PDF**

### 📄 Document Intelligence (RAG)
- Upload PDFs and images for AI analysis
- OCR-powered text extraction (Gemini Vision)
- Chunked embeddings stored in **pgvector**
- Context-aware answers grounded in your documents

### 🔐 Authentication
- Google OAuth 2.0 sign-in
- JWT-based session persistence
- Auto-provisioned user profiles

---

## 🛠️ Tech Stack

| Layer        | Technology                                                      |
| ------------ | --------------------------------------------------------------- |
| **Frontend** | React 19, Vite 8, React Router 7                               |
| **Styling**  | Vanilla CSS with custom design system (Poppins + Inter fonts)   |
| **Backend**  | FastAPI, SQLAlchemy, Alembic                                    |
| **Database** | PostgreSQL with pgvector extension (Neon serverless)            |
| **AI / LLM** | Groq API (OpenAI-compatible), Google Gemini (vision, embeddings)|
| **Auth**     | Google OAuth 2.0, JWT (`jwt-decode`)                            |
| **PDF**      | pypdf, pypdfium2, jsPDF (client-side export)                   |
| **Lint**     | Oxlint                                                          |

---

## 🏗️ Architecture

```
IlmBot/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py             # App entry point, CORS, router mounts
│   │   ├── database/           # SQLAlchemy connection & session
│   │   ├── models/             # ORM models (User, Conversation, Message, etc.)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routes/             # API endpoints (auth, conversation, revision, document)
│   │   └── services/           # Business logic (Groq, Gemini, RAG, quiz, flashcard, OCR)
│   ├── alembic/                # Database migrations
│   ├── uploads/                # User-uploaded files (documents, images)
│   ├── requirements.txt
│   └── .env.example
│
├── src/                        # React frontend
│   ├── components/             # UI components (LearningCoach, CodingCoach, SmartRevision, etc.)
│   ├── context/                # React context providers (Auth, Conversation)
│   ├── hooks/                  # Custom hooks (useSpeechRecognition)
│   ├── utils/                  # Helpers (math rendering, markdown cleanup, image compression)
│   ├── assets/                 # Static assets
│   ├── App.jsx                 # Root component with routing
│   └── main.jsx                # React entry point
│
├── public/                     # Static public assets
├── index.html                  # HTML entry point
├── vite.config.js              # Vite + Rollup config with code splitting
├── package.json
├── start.bat                   # One-click dev launcher (Windows)
└── .env.example
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.10
- **PostgreSQL** with the [`pgvector`](https://github.com/pgvector/pgvector) extension enabled
- A **Google Cloud** project with OAuth 2.0 credentials
- API keys for **Groq** and **Google Gemini**

### 1. Clone the repository

```bash
git clone https://github.com/Amoiz11/Ilmbot-AI-Learning-Companion.git
cd Ilmbot-AI-Learning-Companion
```

### 2. Frontend setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Google Client ID and API URL
```

### 3. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database URL, API keys, and Google Client ID
```

### 4. Database migrations

```bash
cd backend
alembic upgrade head
```

### 5. Start both servers

**Option A — One-click (Windows):**
```bash
start.bat
```

**Option B — Manual:**
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2: Frontend
npm run dev
```

The app will be available at ilmbot-ai-learning-companion.vercel.app

---

## 🔑 Environment Variables

### Frontend (`.env.local`)

| Variable              | Description                         |
| --------------------- | ----------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID        |
| `VITE_API_BASE_URL`     | Backend API URL (default: `http://localhost:8000`) |

### Backend (`backend/.env`)

| Variable               | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string (with pgvector)       |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 Client ID                         |
| `GROQ_API_KEY`         | Groq API key for LLM inference                     |
| `GROQ_MODEL`           | Groq model name (e.g., `openai/gpt-oss-120b`)     |
| `GEMINI_API_KEY`       | Google Gemini API key (vision + embeddings)         |
| `GEMINI_MODEL`         | Primary Gemini model (e.g., `gemini-3.5-flash`)    |
| `GEMINI_FALLBACK_MODEL`| Fallback Gemini model (e.g., `gemini-3.6-flash`)  |
| `ALLOWED_ORIGINS`      | *(Optional)* Comma-separated CORS origins          |

---

## 📦 Deployment Notes

### Frontend

The frontend is a static Vite/React SPA. Build the production bundle:

```bash
npm run build
```

The output in `dist/` can be deployed to any static hosting provider:
- **Vercel** — zero-config Vite support
- **Netlify** — set build command to `npm run build`, publish directory to `dist`
- **Cloudflare Pages** — same configuration as Netlify

### Backend

The FastAPI backend can be deployed to:
- **Railway** / **Render** — connect your repo, set `backend/` as root directory
- **Fly.io** — use a Dockerfile or `fly launch`
- **Any VPS** — run with `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Database

The project is configured for **Neon** (serverless PostgreSQL with pgvector). You can also use any PostgreSQL instance with the `pgvector` extension enabled.

### Important

- **Never commit `.env` files** — use `.env.example` as a template
- Set `ALLOWED_ORIGINS` in production to restrict CORS to your frontend domain
- Ensure the `uploads/` directory is writable in your deployment environment

---

## 📄 License

This project is developed as a personal AI learning tool.

---

<p align="center">
  <em>Built with ❤️ for learners everywhere</em>
</p>

# Resume Ranker — AI-Powered Resume Ranker

Resume Ranker is an enterprise-grade, modern web application designed for HR departments and recruitment agencies. It automates candidate resume parsing, calculates explainable match scores using Natural Language Processing (NLP), TF-IDF vectorization, and cosine similarity, and ranks candidates against customized job descriptions.

---

## Architecture Overview

The system is organized into three decoupled services:

```
Resume Ranker/
├── frontend/               # React.js (Vite), React Router, Recharts, Lucide Icons, Modern SaaS CSS
├── backend/                # Node.js, Express.js REST APIs, JWT Auth, Multer, Mongoose (MongoDB)
├── ai-service/             # Python FastAPI, scikit-learn (TF-IDF, Cosine Similarity), pypdf, python-docx
├── sample_resumes/         # Test candidate resumes (DOCX/PDF) for immediate drag-and-drop testing
├── README.md               # Complete setup, architecture, and deployment guide
└── .env.example            # Environment variables template
```

### Communication Flow
1. **Recruiter** creates a job description and uploads multiple candidate resumes (PDF or DOCX).
2. **Backend (Node.js)** receives the files via Multer, validates file integrity, and routes them to the **Python AI Service**.
3. **AI Service (FastAPI)** extracts text using `pypdf` and `python-docx`, detects contact information, extracts skills, degrees, and work experience, and returns structured data.
4. **NLP Engine** computes:
   - **Required Skills Match (40% Weight)**
   - **Text Similarity (25% Weight)** via TF-IDF n-gram vectorization and cosine similarity
   - **Preferred Skills Match (20% Weight)**
   - **Experience Match (10% Weight)**
   - **Qualification Match (5% Weight)**
5. **Node.js API** persists evaluations and ranking indices in MongoDB and provides real-time dashboard analytics.
6. **React Frontend** visualizes rankings in an interactive table with side-by-side candidate comparison, recruiter status management, evidence snippets, and Recharts metrics.

---

## Key Features

- **JWT Authentication & Multi-Tenancy**: Recruiter registration, login, bcrypt password hashing, and recruiter-specific data isolation.
- **Explainable Scoring Model**: Fully transparent 0–100 score breakdowns. No black boxes.
- **Customizable Scoring Weights**: Recruiters can customize weights per job opening (e.g. increase experience or skill weighting).
- **Multi-Format Resume Parser**: Native extraction for both `.pdf` and `.docx` documents.
- **Evidence Snippets**: Shows exact sentences from the candidate's resume confirming where skills and experience were found.
- **Candidate Comparison**: Compare selected applicants side-by-side with overlapping skill highlighting.
- **Recruiter Workflow**: Mark candidates as *Shortlisted*, *Under Review*, *Awaiting Review*, or *Not Selected*, and add persistent private notes.
- **Real Analytics Dashboard**: Visualizations of candidate score distribution, applicant pipeline volume, and required skill coverage across the applicant pool.
- **Turnkey Demo Seeder**: 1-click sample data generator to instantly populate realistic jobs and evaluated resumes.

---

## Prerequisites

- **Node.js**: v18.x or higher (Tested with Node v24)
- **Python**: v3.10+ (Tested with Python 3.13)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI.
  *(Note: The backend automatically falls back to an embedded `mongodb-memory-server` if an external MongoDB instance is not detected, enabling immediate zero-config testing.)*

---

## Quick Start Installation

### 1. Clone & Setup Python AI Service

```bash
cd "ai-service"

# Install Python dependencies
pip install -r requirements.txt

# Start the Python AI service (Default Port: 8000)
python main.py
```
*The FastAPI interactive documentation will be available at: http://localhost:8000/docs*

---

### 2. Setup Node.js Backend

```bash
cd "../backend"

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env if not already present
cp .env.example .env

# Start the backend server (Default Port: 5000)
npm start
```
*The Backend API will be available at: http://localhost:5000*

---

### 3. Setup React Frontend

```bash
cd "../frontend"

# Install dependencies
npm install

# Start the Vite development server (Default Port: 5173)
npm run dev
```
*Access the Web Application in your browser at: http://localhost:5173*

---

## Environment Variables

### Root / Backend `.env`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/resume_ranker
JWT_SECRET=super-secret-jwt-key-change-in-production-2026
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new recruiter account |
| `POST` | `/api/auth/login` | Recruiter login (returns JWT) |
| `GET` | `/api/auth/me` | Fetch authenticated recruiter profile |
| `PUT` | `/api/auth/profile` | Update recruiter company/profile |
| `POST` | `/api/auth/seed-demo` | Seed turnkey sample jobs & candidates |

### Job Management (`/api/jobs`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all jobs for recruiter with resume counts & top scores |
| `POST` | `/api/jobs` | Create a job description with scoring weights |
| `GET` | `/api/jobs/:jobId` | Get job details and evaluation statistics |
| `PUT` | `/api/jobs/:jobId` | Update job requirements |
| `DELETE` | `/api/jobs/:jobId` | Cascading delete of job and all candidate resumes |

### Resumes & Ranking (`/api/jobs/:jobId/...`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs/:jobId/resumes` | Upload multiple candidate resumes (Multer, PDF/DOCX) |
| `GET` | `/api/jobs/:jobId/resumes` | List uploaded resumes for job |
| `POST` | `/api/jobs/:jobId/rank` | Trigger NLP batch ranking calculations |
| `GET` | `/api/jobs/:jobId/rankings` | Get ranked candidates with filter/sort |
| `GET` | `/api/jobs/:jobId/candidates/:candidateId/analysis` | Get deep candidate NLP evidence & breakdown |
| `POST` | `/api/jobs/:jobId/candidates/compare` | Compare candidate resumes side-by-side |

### Candidate Actions (`/api/candidates/:candidateId/...`)
| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/api/candidates/:candidateId/review` | Update candidate review status (*Shortlisted*, etc.) |
| `POST` | `/api/candidates/:candidateId/notes` | Save private recruiter notes |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard` | Dashboard metrics, score distribution, and pipeline counts |
| `GET` | `/api/analytics/jobs/:jobId` | Skill coverage and applicant benchmarks per opening |

---

## Testing Workflow

1. Open http://localhost:5173.
2. Register a new recruiter account (or log in).
3. Click **Load Sample Demo Data** on the Dashboard or in **Settings** to immediately preview pre-evaluated candidates.
4. Navigate to **Job Positions** → click **Rankings** to inspect candidates, filter by score, and compare applicants side-by-side.
5. Click **Upload Resumes** to upload new files from `sample_resumes/` (`Alex_Mercer_FullStack.docx`, `Priya_Patel_DataScientist.docx`).
6. Click **Analysis** on any candidate to review their score breakdown and contextual evidence snippets.

---

## Deployment Guidelines

### Production Build
- **Frontend**: Run `npm run build` in `frontend/`. Serve the generated `dist/` directory via Nginx, AWS S3/CloudFront, or Vercel.
- **Backend**: Set `NODE_ENV=production`, configure a production MongoDB Atlas connection string, and run via PM2 or Docker.
- **Python AI Service**: Run with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`.

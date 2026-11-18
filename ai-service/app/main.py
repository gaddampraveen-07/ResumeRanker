"""
FastAPI AI Service for AI-Powered Resume Ranker
Handles resume text extraction, NLP skill parsing, TF-IDF cosine similarity matching,
and candidate ranking.
"""

from typing import Dict, List, Any, Optional
import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .parser import parse_resume_full, extract_skills_with_evidence, extract_name, extract_email, extract_phone, extract_education, extract_experience_years, clean_text
from .matcher import evaluate_candidate

app = FastAPI(
    title="Resume Ranker AI Engine",
    description="NLP-based resume parsing, TF-IDF cosine similarity, and candidate ranking API",
    version="1.0.0"
)

# Enable CORS for trusted local and backend communications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request Models ---

class AnalyzeResumeRequest(BaseModel):
    text: str = Field(..., description="Extracted resume text")
    filename: Optional[str] = "resume.pdf"
    customSkills: Optional[List[str]] = None


class JobRequirement(BaseModel):
    title: str = Field(..., description="Job Title")
    description: str = Field(..., description="Full Job Description")
    requiredSkills: List[str] = Field(default_factory=list)
    preferredSkills: List[str] = Field(default_factory=list)
    minimumExperience: Optional[float] = 0.0
    qualifications: Optional[List[str]] = Field(default_factory=list)


class MatchResumeRequest(BaseModel):
    resume: Dict[str, Any]
    job: JobRequirement
    weights: Optional[Dict[str, float]] = None


class CandidateItem(BaseModel):
    id: Optional[str] = None
    resumeId: Optional[str] = None
    name: Optional[str] = None
    extractedText: str
    skills: Optional[List[str]] = None
    yearsOfExperience: Optional[float] = None
    education: Optional[List[Dict[str, Any]]] = None
    evidence: Optional[Dict[str, str]] = None


class RankCandidatesRequest(BaseModel):
    candidates: List[Dict[str, Any]]
    job: JobRequirement
    weights: Optional[Dict[str, float]] = None


# --- API Routes ---

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Resume Ranker AI NLP Service",
        "version": "1.0.0"
    }


@app.post("/extract-text")
async def extract_text_from_file(
    file: UploadFile = File(...)
):
    """
    Accepts multipart file upload (PDF or DOCX).
    Parses and extracts candidate profile, skills, education, experience, and contact info.
    """
    filename = file.filename or "uploaded_file"
    ext = filename.lower().split('.')[-1]
    
    if ext not in ["pdf", "docx", "doc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Supported formats are PDF and DOCX."
        )

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
            
        parsed_result = parse_resume_full(content, filename)
        return {
            "success": True,
            "filename": filename,
            "data": parsed_result
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Parsing error: {str(e)}")


@app.post("/analyze-resume")
def analyze_resume_text(req: AnalyzeResumeRequest):
    """
    Analyzes raw text of a resume, detecting skills, degrees, contact info, and experience.
    """
    cleaned = clean_text(req.text)
    if not cleaned or len(cleaned) < 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume text is too short or empty.")

    email = extract_email(cleaned)
    phone = extract_phone(cleaned)
    name = extract_name(cleaned, email)
    skills, evidence = extract_skills_with_evidence(cleaned, req.customSkills)
    education = extract_education(cleaned)
    years_exp, exp_snippets = extract_experience_years(cleaned)

    return {
        "candidate": {
            "name": name,
            "email": email,
            "phone": phone,
            "skills": skills,
            "education": education,
            "yearsOfExperience": years_exp,
            "experienceSnippets": exp_snippets,
            "evidence": evidence
        },
        "skillsCount": len(skills),
        "wordCount": len(cleaned.split())
    }


@app.post("/match-resume")
def match_single_resume(req: MatchResumeRequest):
    """
    Calculates TF-IDF cosine similarity and skill/experience matching between a single resume and job.
    """
    try:
        job_dict = req.job.model_dump()
        evaluation = evaluate_candidate(req.resume, job_dict, req.weights)
        return {
            "success": True,
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Matching calculation failed: {str(e)}")


@app.post("/rank-candidates")
def rank_multiple_candidates(req: RankCandidatesRequest):
    """
    Ranks multiple resumes against a job description.
    Sorts candidates from highest to lowest score and assigns ordinal ranks.
    """
    if not req.candidates:
        return {
            "success": True,
            "rankedCandidates": [],
            "totalCandidates": 0
        }

    job_dict = req.job.model_dump()
    evaluated_list = []

    for index, cand in enumerate(req.candidates):
        try:
            eval_result = evaluate_candidate(cand, job_dict, req.weights)
            # Retain references
            eval_result["resumeId"] = cand.get("resumeId") or cand.get("id") or str(index)
            eval_result["originalFileName"] = cand.get("originalFileName", "resume.pdf")
            eval_result["candidateName"] = eval_result["candidate"]["name"]
            evaluated_list.append(eval_result)
        except Exception as e:
            # Handle individual evaluation failure gracefully without crashing the whole batch
            evaluated_list.append({
                "resumeId": cand.get("resumeId") or str(index),
                "originalFileName": cand.get("originalFileName", "resume.pdf"),
                "candidateName": cand.get("name", f"Candidate {index + 1}"),
                "overallScore": 0.0,
                "componentScores": {"requiredSkills": 0, "preferredSkills": 0, "textSimilarity": 0, "experience": 0, "qualification": 0},
                "matchingSkills": [],
                "missingRequiredSkills": req.job.requiredSkills,
                "missingPreferredSkills": req.job.preferredSkills,
                "recommendation": "Evaluation failed due to unreadable content format.",
                "explanation": f"Evaluation error: {str(e)}"
            })

    # Sort candidates by overallScore descending, then by textSimilarity descending
    evaluated_list.sort(
        key=lambda x: (x.get("overallScore", 0.0), x.get("componentScores", {}).get("textSimilarity", 0.0)),
        reverse=True
    )

    # Assign rank 1-indexed
    for idx, item in enumerate(evaluated_list):
        item["rank"] = idx + 1

    return {
        "success": True,
        "jobTitle": req.job.title,
        "totalCandidates": len(evaluated_list),
        "rankedCandidates": evaluated_list
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

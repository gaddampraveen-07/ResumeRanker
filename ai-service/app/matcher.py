"""
NLP Matching and Scoring Engine for AI-Powered Resume Ranker
Implements TF-IDF vectorization, cosine similarity, skill matching,
qualification verification, experience scoring, and explainable AI rankings.
"""

import math
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .skills_db import CANONICAL_SKILLS


def calculate_tfidf_similarity(resume_text: str, job_text: str) -> float:
    """
    Computes cosine similarity between resume text and job description
    using TF-IDF vectorization with English stop words and sublinear term frequency.
    Returns float score between 0.0 and 100.0.
    """
    if not resume_text.strip() or not job_text.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            sublinear_tf=True,
            max_features=5000
        )
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_text])
        sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        raw_score = float(sim_matrix[0][0])
        # Scale to 0 - 100 with a slight curve to reflect real-world resume alignment
        score_100 = round(raw_score * 100, 2)
        return min(max(score_100, 0.0), 100.0)
    except Exception as e:
        return 0.0


def normalize_skill_name(skill: str) -> str:
    """Map skill to canonical name if possible, or return title case."""
    clean = skill.strip()
    return CANONICAL_SKILLS.get(clean.lower(), clean)


def match_skills(candidate_skills: List[str], target_skills: List[str]) -> Dict[str, Any]:
    """
    Matches candidate skills with target skills (case-insensitive and canonicalized).
    Returns matched skills, missing skills, and match percentage (0 - 100).
    """
    if not target_skills:
        return {
            "matched": [],
            "missing": [],
            "ratio": 1.0,
            "score": 100.0
        }

    canonical_target = {normalize_skill_name(s).lower(): normalize_skill_name(s) for s in target_skills if s.strip()}
    canonical_candidate = {normalize_skill_name(s).lower(): normalize_skill_name(s) for s in candidate_skills if s.strip()}

    matched = []
    missing = []

    for key, display_name in canonical_target.items():
        if key in canonical_candidate:
            matched.append(display_name)
        else:
            # Check for partial inclusion (e.g., 'React' vs 'React.js')
            found_partial = False
            for c_key in canonical_candidate.keys():
                if key in c_key or c_key in key:
                    matched.append(display_name)
                    found_partial = True
                    break
            if not found_partial:
                missing.append(display_name)

    ratio = len(matched) / len(canonical_target) if canonical_target else 1.0
    return {
        "matched": sorted(matched),
        "missing": sorted(missing),
        "ratio": ratio,
        "score": round(ratio * 100, 2)
    }


def match_experience(candidate_years: Optional[float], required_years: float) -> Tuple[float, str]:
    """
    Scores experience on a 0-100 scale based on job's minimum required years.
    Returns (score, explanation_note).
    """
    if required_years <= 0:
        return 100.0, "No minimum experience required."

    if candidate_years is None:
        return 50.0, "Experience years not explicitly stated in resume (neutral baseline applied)."

    if candidate_years >= required_years:
        surplus = candidate_years - required_years
        bonus = min(surplus * 2, 10.0) # modest bonus capped at 100
        score = min(100.0, 90.0 + bonus)
        return round(score, 1), f"Meets experience criteria ({candidate_years} yrs >= {required_years} yrs required)."
    else:
        # Partial credit proportional to required years
        fraction = candidate_years / required_years
        score = max(20.0, fraction * 80.0)
        return round(score, 1), f"Below requirement ({candidate_years} yrs vs {required_years} yrs required)."


def match_qualifications(education_list: List[Dict[str, Any]], required_qualifications: List[str]) -> Tuple[float, str]:
    """
    Evaluates whether any extracted degree matches required qualifications.
    """
    if not required_qualifications:
        return 100.0, "No specific educational qualification required."

    if not education_list:
        return 40.0, "Educational background not explicitly detected in resume."

    candidate_degrees = " ".join([e.get("degree", "") + " " + e.get("rawText", "") for e in education_list]).lower()

    matched_quals = []
    missing_quals = []

    for req in required_qualifications:
        if not req.strip():
            continue
        req_clean = req.lower().strip()
        if req_clean in candidate_degrees or any(w in candidate_degrees for w in req_clean.split() if len(w) > 3):
            matched_quals.append(req)
        else:
            missing_quals.append(req)

    if not missing_quals:
        return 100.0, f"Matched required qualifications: {', '.join(matched_quals)}"
    elif matched_quals:
        ratio = len(matched_quals) / len(required_qualifications)
        score = round(ratio * 90.0, 1)
        return score, f"Partially matched qualifications: {', '.join(matched_quals)}"
    else:
        return 45.0, f"Did not explicitly match required qualifications: {', '.join(missing_quals)}"


def evaluate_candidate(
    resume_data: Dict[str, Any],
    job_data: Dict[str, Any],
    custom_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Core scoring model:
    Default Weights:
    - Required skills match: 40%
    - Preferred skills match: 20%
    - Text similarity: 25%
    - Experience match: 10%
    - Qualification match: 5%
    """
    weights = {
        "requiredSkills": 0.40,
        "preferredSkills": 0.20,
        "textSimilarity": 0.25,
        "experience": 0.10,
        "qualification": 0.05
    }

    if custom_weights:
        weights.update(custom_weights)

    # If job has no preferred skills, redistribute the 20% to avoid unfair penalty
    req_skills = job_data.get("requiredSkills", [])
    pref_skills = job_data.get("preferredSkills", [])
    
    if not pref_skills:
        weights["requiredSkills"] += weights["preferredSkills"] * 0.6
        weights["textSimilarity"] += weights["preferredSkills"] * 0.4
        weights["preferredSkills"] = 0.0

    # Normalize weights so sum is 1.0
    total_w = sum(weights.values())
    if total_w > 0:
        normalized_weights = {k: v / total_w for k, v in weights.items()}
    else:
        normalized_weights = weights

    candidate_skills = resume_data.get("skills", [])
    resume_text = resume_data.get("extractedText", "")
    job_desc = job_data.get("description", "")
    job_title = job_data.get("title", "")
    full_job_text = f"{job_title}\n{job_desc}\nSkills: {', '.join(req_skills + pref_skills)}"

    # 1. Required skills match
    req_match = match_skills(candidate_skills, req_skills)
    score_req_skills = req_match["score"]

    # 2. Preferred skills match
    pref_match = match_skills(candidate_skills, pref_skills) if pref_skills else {"score": 100.0, "matched": [], "missing": []}
    score_pref_skills = pref_match["score"]

    # 3. Text Similarity (TF-IDF + Cosine Similarity)
    score_text_sim = calculate_tfidf_similarity(resume_text, full_job_text)

    # 4. Experience match
    cand_years = resume_data.get("yearsOfExperience")
    req_years = float(job_data.get("minimumExperience", 0) or 0)
    score_exp, exp_note = match_experience(cand_years, req_years)

    # 5. Qualification match
    education = resume_data.get("education", [])
    req_quals = job_data.get("qualifications", [])
    score_qual, qual_note = match_qualifications(education, req_quals)

    # Calculate overall weighted score
    overall_score = (
        (score_req_skills * normalized_weights["requiredSkills"]) +
        (score_pref_skills * normalized_weights["preferredSkills"]) +
        (score_text_sim * normalized_weights["textSimilarity"]) +
        (score_exp * normalized_weights["experience"]) +
        (score_qual * normalized_weights["qualification"])
    )
    overall_score = round(min(max(overall_score, 0.0), 100.0), 1)

    # Determine recommendation based on configurable recruiter shortlist threshold (default 80%)
    threshold = float(job_data.get("shortlistThreshold", 80) or 80)
    if overall_score >= threshold:
        recommendation = f"Strong match (≥ {threshold:.0f}%). Fully eligible for shortlisting and interview scheduling."
    elif overall_score >= max(40.0, threshold - 20.0):
        recommendation = f"Moderate match (< {threshold:.0f}%). Candidate meets core criteria but falls below the {threshold:.0f}% shortlisting threshold."
    elif overall_score >= 40:
        recommendation = f"Potential match (< {threshold:.0f}%). Notable gaps in required skills. Not eligible for shortlisting."
    else:
        recommendation = f"Low match (< {threshold:.0f}%). Major qualification and experience gaps. Not eligible for shortlisting."

    # Additional skills candidate possesses that were not in required/preferred
    all_job_skills = {normalize_skill_name(s).lower() for s in (req_skills + pref_skills)}
    additional_skills = [s for s in candidate_skills if normalize_skill_name(s).lower() not in all_job_skills]

    # Build human-readable explanation
    req_cnt = len(req_match["matched"])
    req_total = len(req_skills)
    skill_summary = f"Matched {req_cnt}/{req_total} required skills." if req_total > 0 else "All skills matched."
    missing_str = f" Missing required: {', '.join(req_match['missing'])}." if req_match["missing"] else " All required skills present."
    
    explanation = (
        f"{skill_summary}{missing_str} Text similarity is {score_text_sim:.1f}%. "
        f"{exp_note} Overall candidate relevance index: {overall_score}/100."
    )

    return {
        "candidate": {
            "name": resume_data.get("name", "Candidate"),
            "email": resume_data.get("email", "Not provided"),
            "phone": resume_data.get("phone", "Not provided"),
            "skills": candidate_skills,
            "education": education,
            "yearsOfExperience": cand_years,
            "experienceSnippets": resume_data.get("experienceSnippets", [])
        },
        "matchingSkills": req_match["matched"] + pref_match["matched"],
        "missingRequiredSkills": req_match["missing"],
        "missingPreferredSkills": pref_match["missing"],
        "additionalSkills": additional_skills,
        "evidence": resume_data.get("evidence", {}),
        "componentScores": {
            "requiredSkills": score_req_skills,
            "preferredSkills": score_pref_skills,
            "textSimilarity": score_text_sim,
            "experience": score_exp,
            "qualification": score_qual
        },
        "weights": {k: round(v * 100, 1) for k, v in normalized_weights.items()},
        "overallScore": overall_score,
        "recommendation": recommendation,
        "explanation": explanation
    }

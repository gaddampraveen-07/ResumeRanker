"""
Resume Parser Module for AI-Powered Resume Ranker
Extracts raw text from PDF & DOCX, normalizes content, and extracts structured
candidate information: Name, Email, Phone, Skills, Education, Experience, Evidence.
"""

import re
import io
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Document parsers
import pypdf
import docx

from .skills_db import CANONICAL_SKILLS, DEGREE_PATTERNS


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text cleanly from PDF bytes using pypdf."""
    try:
        pdf_file = io.BytesIO(file_content)
        reader = pypdf.PdfReader(pdf_file)
        text_parts = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts).strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX bytes including paragraphs and table contents."""
    try:
        docx_file = io.BytesIO(file_content)
        doc = docx.Document(docx_file)
        text_parts = []
        
        # Paragraphs
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text.strip())
        
        # Tables
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    text_parts.append(" | ".join(row_cells))
                    
        return "\n".join(text_parts).strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters while preserving punctuation."""
    if not text:
        return ""
    # Normalize multiple newlines and spaces
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'[\t\f\v ]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_email(text: str) -> str:
    """Extract candidate email using RFC-compliant regex pattern."""
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    matches = re.findall(email_pattern, text)
    if matches:
        # Filter out common placeholders or invalid examples
        for email in matches:
            if not email.endswith(('.png', '.jpg', '.jpeg', '.gif')):
                return email.strip()
    return "Not provided"


def extract_phone(text: str) -> str:
    """Extract phone number in international, local or standard format."""
    phone_pattern = r'(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}'
    matches = re.finditer(phone_pattern, text)
    for m in matches:
        phone_candidate = m.group(0).strip()
        digits = re.sub(r'\D', '', phone_candidate)
        # Check if length matches standard phone numbers (10 to 14 digits)
        if 10 <= len(digits) <= 14:
            # Exclude obvious year sequences or postal codes
            if not (digits.startswith("20") and len(digits) == 10 and digits.endswith("20")):
                return phone_candidate
    return "Not provided"


def extract_name(text: str, email: str = "") -> str:
    """
    Extract candidate name from header or top lines.
    Uses structural heuristics and excludes common resume section labels.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    invalid_keywords = {
        "resume", "curriculum", "vitae", "cv", "summary", "profile", "contact",
        "experience", "education", "skills", "projects", "certifications",
        "phone", "email", "address", "linkedin", "github", "page", "portfolio"
    }

    # Inspect top 6 lines
    for line in lines[:6]:
        # Strip common punctuation
        clean_line = re.sub(r'[^a-zA-Z\s.]', '', line).strip()
        words = clean_line.split()
        if 2 <= len(words) <= 4:
            lower_words = [w.lower() for w in words]
            if not any(k in lower_words for k in invalid_keywords):
                # Verify that words start with capital letter or title case
                if all(w[0].isupper() for w in words if len(w) > 1):
                    return clean_line

    # Fallback to email prefix if reasonable
    if email and email != "Not provided":
        local_part = email.split('@')[0]
        cleaned_prefix = re.sub(r'[\._0-9]+', ' ', local_part).strip().title()
        if len(cleaned_prefix.split()) >= 2:
            return cleaned_prefix
        elif cleaned_prefix:
            return cleaned_prefix + " (Candidate)"

    return "Candidate"


def extract_skills_with_evidence(text: str, additional_skills: Optional[List[str]] = None) -> Tuple[List[str], Dict[str, str]]:
    """
    Extract skills from resume text using canonical dictionary and custom skills.
    Also captures evidence snippets (the sentence or bullet point where each skill appears).
    """
    found_skills = set()
    evidence_map = {}
    
    # Combine canonical skills with any custom skills supplied
    target_skills = dict(CANONICAL_SKILLS)
    if additional_skills:
        for s in additional_skills:
            if s and s.strip():
                clean_s = s.strip()
                target_skills[clean_s.lower()] = clean_s

    # Break text into sentences/lines for snippet extraction
    lines = [line.strip() for line in re.split(r'[\n\r•\-\*]+', text) if len(line.strip()) > 3]

    lower_text = text.lower()

    # Sort skill keys by length descending to match longest phrases first (e.g., "Machine Learning" before "R")
    sorted_skill_keys = sorted(target_skills.keys(), key=lambda x: len(x), reverse=True)

    for skill_key in sorted_skill_keys:
        canonical_name = target_skills[skill_key]
        
        # Regex pattern with word boundaries (handling special chars like c++, c#, .net)
        escaped_key = re.escape(skill_key)
        # For alphanumeric words, require word boundaries; for special characters, adapt
        if re.match(r'^[a-zA-Z0-9\s]+$', skill_key):
            pattern = rf'(?<![a-zA-Z0-9]){escaped_key}(?![a-zA-Z0-9])'
        else:
            pattern = rf'(?:\b|\s|^){escaped_key}(?:\b|\s|$|[,\.;:\)])'

        match = re.search(pattern, lower_text)
        if match:
            found_skills.add(canonical_name)
            
            # Find evidence sentence/line
            if canonical_name not in evidence_map:
                for line in lines:
                    if re.search(pattern, line.lower()):
                        evidence_map[canonical_name] = line[:180] + ("..." if len(line) > 180 else "")
                        break

    return sorted(list(found_skills)), evidence_map


def extract_education(text: str) -> List[Dict[str, Any]]:
    """Extract degrees, educational institutions, and graduation years."""
    education_entries = []
    lines = text.split('\n')
    
    year_pattern = r'\b(19\d{2}|20\d{2})\b'

    for line in lines:
        lower_line = line.lower()
        for deg_key, deg_label in DEGREE_PATTERNS.items():
            pattern = rf'(?<![a-zA-Z0-9]){re.escape(deg_key)}(?![a-zA-Z0-9])'
            if re.search(pattern, lower_line):
                # Search for graduation year
                year_match = re.findall(year_pattern, line)
                grad_year = year_match[-1] if year_match else "Year not specified"
                
                # Check for duplicate degree label
                if not any(e["degree"] == deg_label for e in education_entries):
                    education_entries.append({
                        "degree": deg_label,
                        "rawText": line.strip()[:140],
                        "year": grad_year
                    })
                break

    return education_entries


def extract_experience_years(text: str) -> Tuple[Optional[float], List[str]]:
    """
    Infer total years of experience from explicitly stated years (e.g. '5 years of experience')
    or date ranges (e.g. '2019 - 2024').
    """
    current_year = datetime.now().year
    snippets = []

    # 1. Look for explicit mentions like '5+ years of experience', '3 years experience'
    explicit_pattern = r'(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience'
    explicit_matches = re.finditer(explicit_pattern, text, re.IGNORECASE)
    explicit_years = []
    for m in explicit_matches:
        try:
            val = float(m.group(1))
            if 0 < val <= 40:
                explicit_years.append(val)
                snippets.append(m.group(0))
        except ValueError:
            pass

    if explicit_years:
        # Return maximum explicit statement (often in summary)
        return max(explicit_years), snippets

    # 2. Extract date ranges like '2018 - 2022' or '2020 - Present'
    date_range_pattern = r'\b(20[0-2]\d|199\d)\s*(?:-|–|to)\s*(20[0-2]\d|199\d|present|current)\b'
    range_matches = re.finditer(date_range_pattern, text, re.IGNORECASE)
    
    total_inferred_months = 0
    detected_intervals = []

    for m in range_matches:
        start_year = int(m.group(1))
        end_str = m.group(2).lower()
        end_year = current_year if ("present" in end_str or "current" in end_str) else int(end_str)
        
        if 1980 <= start_year <= current_year and start_year <= end_year <= current_year + 1:
            duration = end_year - start_year
            # Avoid counting education ranges as 40 years
            if 0 <= duration <= 25:
                detected_intervals.append((start_year, end_year))
                snippets.append(m.group(0))

    if detected_intervals:
        # Approximate unique range coverage
        min_start = min(s for s, e in detected_intervals)
        max_end = max(e for s, e in detected_intervals)
        span = max_end - min_start
        # Cap span reasonably
        est_years = min(span, 30)
        return float(est_years), snippets

    return None, []


def parse_resume_full(file_content: bytes, filename: str, custom_skills: Optional[List[str]] = None) -> Dict[str, Any]:
    """Complete parsing pipeline for an uploaded resume file."""
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        raw_text = extract_text_from_pdf(file_content)
    elif ext in ['docx', 'doc']:
        raw_text = extract_text_from_docx(file_content)
    else:
        raise ValueError(f"Unsupported file format '.{ext}'. Supported formats are PDF and DOCX.")

    cleaned = clean_text(raw_text)
    if not cleaned or len(cleaned) < 20:
        raise ValueError("Resume file appears to be empty or contains unreadable text.")

    email = extract_email(cleaned)
    phone = extract_phone(cleaned)
    name = extract_name(cleaned, email)
    skills, evidence = extract_skills_with_evidence(cleaned, custom_skills)
    education = extract_education(cleaned)
    years_exp, exp_snippets = extract_experience_years(cleaned)

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "extractedText": cleaned,
        "skills": skills,
        "evidence": evidence,
        "education": education,
        "yearsOfExperience": years_exp,
        "experienceSnippets": exp_snippets,
        "charCount": len(cleaned),
        "wordCount": len(cleaned.split()),
    }

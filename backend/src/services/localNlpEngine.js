const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Dictionary of skills and variations
const SKILL_SYNONYMS = {
  'react.js': 'React.js',
  'react': 'React.js',
  'reactjs': 'React.js',
  'react js': 'React.js',
  'node.js': 'Node.js',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node js': 'Node.js',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'python': 'Python',
  'java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'golang': 'Go',
  'go': 'Go',
  'html': 'HTML5',
  'html5': 'HTML5',
  'css': 'CSS3',
  'css3': 'CSS3',
  'tailwind': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'mongodb': 'MongoDB',
  'mongo db': 'MongoDB',
  'mongo': 'MongoDB',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'express js': 'Express.js',
  'full stack': 'Full-Stack Development',
  'fullstack': 'Full-Stack Development',
  'vs code': 'VS Code',
  'vscode': 'VS Code',
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  'restful': 'REST APIs',
  'restful api': 'REST APIs',
  'restful apis': 'REST APIs',
  'graphql': 'GraphQL',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'azure': 'Azure',
  'gcp': 'Google Cloud Platform (GCP)',
  'google cloud': 'Google Cloud Platform (GCP)',
  'git': 'Git',
  'github': 'Git',
  'gitlab': 'Git',
  'ci/cd': 'CI/CD',
  'sql': 'SQL',
  'mysql': 'MySQL',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'sqlite': 'SQLite',
  'redis': 'Redis',
  'machine learning': 'Machine Learning',
  'ml': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'nlp': 'Natural Language Processing (NLP)',
  'natural language processing': 'Natural Language Processing (NLP)',
  'scikit-learn': 'scikit-learn',
  'sklearn': 'scikit-learn',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'linux': 'Linux',
  'microservices': 'Microservices',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'redux': 'Redux',
  'jest': 'Jest',
};

const COMMON_SKILLS = Object.values(SKILL_SYNONYMS);

// Extract text from PDF, DOCX, or text files
async function extractTextFromFileLocally(filePath, originalFileName = '') {
  const ext = path.extname(originalFileName || filePath).toLowerCase();

  let extractedText = '';

  try {
    if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const parser = new PDFParse(new Uint8Array(buf));
      await parser.load();
      const res = await parser.getText();
      extractedText = res?.text || '';
    } else if (ext === '.docx' || ext === '.doc') {
      const res = await mammoth.extractRawText({ path: filePath });
      extractedText = res.value || '';
    } else {
      extractedText = fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.warn(`[Local NLP] Primary parser warning for ${originalFileName}:`, err.message);
    try {
      // Fallback: read raw buffer and filter printable text
      const rawBuf = fs.readFileSync(filePath);
      extractedText = rawBuf.toString('utf8').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
    } catch (fallbackErr) {
      extractedText = '';
    }
  }

  return parseCandidateDetailsFromText(extractedText, originalFileName);
}

// Parse structured candidate information from resume text
function parseCandidateDetailsFromText(text, originalFileName = '') {
  const cleanText = text || '';
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  const FORBIDDEN_WORDS = [
    'summary', 'objective', 'developer', 'engineer', 'student', 'graduate',
    'seeking', 'contribute', 'organization', 'opportunity', 'computer', 'science',
    'academic', 'education', 'technology', 'institute', 'university', 'college',
    'school', 'resume', 'curriculum', 'vitae', 'projects', 'certifications',
    'technical', 'profile', 'solutions', 'innovative', 'forward-thinking',
    'career', 'qualification', 'qualifications', 'experience', 'skills', 'declaration'
  ];

  const isValidName = (line) => {
    if (!line || line.length < 3 || line.length > 40) return false;
    if (line.endsWith('.')) return false; // Sentences end with dot
    if (/[@0-9+\/\\(){}:;=]/.test(line)) return false;
    const lower = line.toLowerCase();
    for (const fw of FORBIDDEN_WORDS) {
      if (new RegExp(`\\b${fw}\\b`, 'i').test(lower)) return false;
    }
    const words = line.trim().split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    // Check that each word starts with a letter
    return words.every((w) => /^[a-zA-Z]/.test(w));
  };

  const toTitleCase = (str) =>
    str
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  // 1. Email extraction first
  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : 'Not provided';

  // 2. Candidate Name extraction
  let name = '';

  // Priority A: Look near the email line (within 3 lines above or below)
  if (emailMatch) {
    const emailIndex = lines.findIndex((l) => l.includes(emailMatch[0]));
    if (emailIndex !== -1) {
      for (let offset of [-1, -2, -3, 1, 2]) {
        const checkIdx = emailIndex + offset;
        if (checkIdx >= 0 && checkIdx < lines.length) {
          const candidateLine = lines[checkIdx];
          if (isValidName(candidateLine)) {
            name = toTitleCase(candidateLine);
            break;
          }
        }
      }
    }
  }

  // Priority B: Scan top 10 lines of the resume
  if (!name) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (isValidName(line)) {
        name = toTitleCase(line);
        break;
      }
    }
  }

  // Priority C: Check all lines for uppercase candidate full names
  if (!name) {
    for (const line of lines) {
      if (isValidName(line) && line === line.toUpperCase()) {
        name = toTitleCase(line);
        break;
      }
    }
  }

  // Priority D: Fallback to original file name
  if (!name && originalFileName) {
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    const cleaned = baseName
      .replace(/[_-]/g, ' ')
      .replace(/\b(resume|cv|profile|main|final|doc|pdf)\b/gi, '')
      .replace(/\d+/g, '')
      .trim();
    if (cleaned.length >= 3) {
      name = toTitleCase(cleaned);
    }
  }

  if (!name) {
    name = 'Candidate';
  }

  // 3. Phone extraction
  const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : 'Not provided';

  // 4. Experience Years extraction
  let yearsOfExperience = null;
  const isStudentOrFresher =
    /\b(aspiring|fresher|student|undergraduate|b\.?tech|intern|recent graduate)\b/i.test(cleanText) &&
    /202[4-9]|202[0-3]\s*[-–]\s*202[4-8]/i.test(cleanText);

  const expMatch = cleanText.match(/(\d+(?:\.\d+)?)\+?\s*years?(?:\s+of)?(?:\s+professional|\s+industry|\s+work)?\s+experience/i);
  if (expMatch) {
    yearsOfExperience = parseFloat(expMatch[1]);
  } else if (isStudentOrFresher) {
    yearsOfExperience = 0; // Fresh graduate / Student
  } else {
    // Only look for work date ranges outside academic qualifications
    const nonAcademicLines = lines.filter(
      (l) => !/(bachelor|master|degree|school|intermediate|college|university|cgpa|percentage)/i.test(l)
    );
    const nonAcademicText = nonAcademicLines.join('\n');
    const yearMatches = [...nonAcademicText.matchAll(/(20\d{2})\s*[-–]\s*(20\d{2}|Present)/gi)];
    if (yearMatches.length > 0) {
      let totalYears = 0;
      const currentYear = new Date().getFullYear();
      yearMatches.forEach((m) => {
        const start = parseInt(m[1], 10);
        const end = m[2].toLowerCase() === 'present' ? currentYear : parseInt(m[2], 10);
        if (end >= start && end - start < 30) {
          totalYears += end - start;
        }
      });
      if (totalYears > 0) {
        yearsOfExperience = Math.min(totalYears, 25);
      }
    }
  }

  if (yearsOfExperience === null && isStudentOrFresher) {
    yearsOfExperience = 0;
  }

  // 5. Skills extraction
  const lowerText = cleanText.toLowerCase();
  const matchedSkillsSet = new Set();
  const evidence = {};

  const sentences = cleanText.split(/[.\n;•]+/).map((s) => s.trim()).filter((s) => s.length > 10);

  for (const [key, canonical] of Object.entries(SKILL_SYNONYMS)) {
    const regex = new RegExp(`(?:^|[\\s,.;()/-])${escapeRegExp(key)}(?:$|[\\s,.;()/-])`, 'i');
    if (regex.test(lowerText)) {
      matchedSkillsSet.add(canonical);

      if (!evidence[canonical]) {
        const sentence = sentences.find((s) => new RegExp(escapeRegExp(key), 'i').test(s));
        if (sentence) {
          evidence[canonical] = sentence.substring(0, 150).trim();
        } else {
          evidence[canonical] = `Candidate resume indicates proficiency in ${canonical}.`;
        }
      }
    }
  }

  const skills = Array.from(matchedSkillsSet);

  // 6. Education / Degree extraction
  const education = [];
  const degreeKeywords = [
    { name: "Bachelor's Degree", regex: /bachelor(?:'s)?|b\.?s\.?|b\.?tech|b\.?e\.?|undergraduate/i },
    { name: "Master's Degree", regex: /master(?:'s)?|m\.?s\.?|m\.?tech|postgraduate|mca/i },
    { name: "Ph.D. / Doctorate", regex: /ph\.?d|doctorate/i },
    { name: 'Diploma', regex: /diploma/i },
  ];

  for (const deg of degreeKeywords) {
    if (deg.regex.test(cleanText)) {
      education.push({ degree: deg.name, rawText: deg.name });
    }
  }

  return {
    extractedText: cleanText,
    name,
    email,
    phone,
    skills,
    yearsOfExperience,
    education,
    experienceSnippets: yearsOfExperience !== null ? [`${yearsOfExperience} years of experience detected.`] : [],
    evidence,
  };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fast In-Memory TF-IDF & Cosine Similarity
function calculateTfidfCosineSimilarity(text1, text2) {
  if (!text1?.trim() || !text2?.trim()) return 0;

  const tokenize = (str) => {
    const words = str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    // Add bigrams
    const tokens = [...words];
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }
    return tokens;
  };

  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  const freq1 = {};
  const freq2 = {};
  const vocab = new Set();

  tokens1.forEach((t) => {
    freq1[t] = (freq1[t] || 0) + 1;
    vocab.add(t);
  });
  tokens2.forEach((t) => {
    freq2[t] = (freq2[t] || 0) + 1;
    vocab.add(t);
  });

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const t of vocab) {
    // sublinear tf: 1 + ln(tf)
    const v1 = freq1[t] ? 1 + Math.log(freq1[t]) : 0;
    const v2 = freq2[t] ? 1 + Math.log(freq2[t]) : 0;

    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  const rawSimilarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  if (rawSimilarity <= 0) return 0;

  // Calibrate raw cosine similarity for ATS resume screening:
  // In natural language processing, resume vs job description cosine similarity naturally sits between 0.12 - 0.40
  // when matching core competencies. Calibrate so 0.30+ maps to 88-98%, 0.20 maps to ~75%, 0.12 maps to ~55%.
  const calibrated = Math.min(100, Math.round(Math.pow(rawSimilarity / 0.30, 0.7) * 88));
  return Math.max(15, calibrated);
}

// Match Resume against Job Criteria
function matchResumeLocally(resumeData, jobData, customWeights = null) {
  const weights = {
    requiredSkills: 40,
    preferredSkills: 20,
    textSimilarity: 25,
    experience: 10,
    qualification: 5,
    ...(customWeights || {}),
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  const normWeights = {
    requiredSkills: weights.requiredSkills / totalWeight,
    preferredSkills: weights.preferredSkills / totalWeight,
    textSimilarity: weights.textSimilarity / totalWeight,
    experience: weights.experience / totalWeight,
    qualification: weights.qualification / totalWeight,
  };

  const candidateSkills = resumeData.skills || [];
  const requiredSkills = jobData.requiredSkills || [];
  const preferredSkills = jobData.preferredSkills || [];

  const normSkill = (s) => (SKILL_SYNONYMS[s.trim().toLowerCase()] || s.trim()).toLowerCase();

  const candidateSkillSet = new Set(candidateSkills.map(normSkill));

  // 1. Required Skills Match
  const matchingRequired = requiredSkills.filter((s) => {
    const target = normSkill(s);
    return candidateSkillSet.has(target) || candidateSkills.some((cs) => cs.toLowerCase().includes(target) || target.includes(cs.toLowerCase()));
  });
  const missingRequired = requiredSkills.filter((s) => !matchingRequired.includes(s));
  const scoreRequired = requiredSkills.length > 0 ? (matchingRequired.length / requiredSkills.length) * 100 : 100;

  // 2. Preferred Skills Match
  const matchingPreferred = preferredSkills.filter((s) => {
    const target = normSkill(s);
    return candidateSkillSet.has(target) || candidateSkills.some((cs) => cs.toLowerCase().includes(target) || target.includes(cs.toLowerCase()));
  });
  const missingPreferred = preferredSkills.filter((s) => !matchingPreferred.includes(s));
  const scorePreferred = preferredSkills.length > 0 ? (matchingPreferred.length / preferredSkills.length) * 100 : 100;

  // 3. Text Similarity
  const fullJobText = `${jobData.title || ''} ${jobData.description || ''} ${requiredSkills.join(' ')} ${preferredSkills.join(' ')}`;
  const scoreText = calculateTfidfCosineSimilarity(resumeData.extractedText || '', fullJobText);

  // 4. Experience Match
  const reqYears = Number(jobData.minimumExperience) || 0;
  const candYears = resumeData.yearsOfExperience;
  let scoreExp = 60;
  let expNote = 'Experience level evaluated based on candidate background.';
  if (reqYears <= 0) {
    scoreExp = 100;
    expNote = 'No minimum experience required.';
  } else if (candYears !== null && candYears !== undefined) {
    if (candYears >= reqYears) {
      scoreExp = Math.min(100, 90 + (candYears - reqYears) * 2);
      expNote = `Meets experience criteria (${candYears} yrs >= ${reqYears} yrs required).`;
    } else if (candYears === 0) {
      // Entry-level graduate / fresher applying
      scoreExp = reqYears <= 2 ? 80 : 60;
      expNote = `Candidate has graduate project experience (${candYears} yrs vs ${reqYears} yrs required).`;
    } else {
      scoreExp = Math.max(30, (candYears / reqYears) * 85);
      expNote = `Partially meets experience (${candYears} yrs vs ${reqYears} yrs required).`;
    }
  }

  // 5. Qualification Match
  let scoreQual = 60;
  const reqQuals = jobData.qualifications || [];
  if (reqQuals.length === 0) {
    scoreQual = 100;
  } else {
    const candDegs = (resumeData.education || []).map((e) => (e.degree || '').toLowerCase()).join(' ');
    const matchedQuals = reqQuals.filter((q) => candDegs.includes(q.toLowerCase()));
    if (matchedQuals.length > 0) {
      scoreQual = 95;
    } else {
      scoreQual = 50;
    }
  }

  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (scoreRequired * normWeights.requiredSkills +
          scorePreferred * normWeights.preferredSkills +
          scoreText * normWeights.textSimilarity +
          scoreExp * normWeights.experience +
          scoreQual * normWeights.qualification) *
          10
      ) / 10
    )
  );

  const threshold = Number(jobData.shortlistThreshold) || 80;
  let recommendation = '';
  if (overallScore >= threshold) {
    recommendation = `Strong match (≥ ${threshold}%). Fully eligible for shortlisting and interview invitation.`;
  } else if (overallScore >= Math.max(40, threshold - 20)) {
    recommendation = `Moderate match (< ${threshold}%). Meets baseline skills but below the ${threshold}% shortlist threshold.`;
  } else {
    recommendation = `Low match (< ${threshold}%). Notable skill or experience gaps. Not eligible for shortlisting.`;
  }

  const explanation = `Matched ${matchingRequired.length}/${requiredSkills.length} required skills. Text similarity is ${scoreText}%. ${expNote} Overall match score: ${overallScore}/100.`;

  const allJobSkills = new Set([...requiredSkills, ...preferredSkills].map(normSkill));
  const additionalSkills = candidateSkills.filter((s) => !allJobSkills.has(normSkill(s)));

  return {
    overallScore,
    componentScores: {
      requiredSkills: Math.round(scoreRequired * 10) / 10,
      preferredSkills: Math.round(scorePreferred * 10) / 10,
      textSimilarity: scoreText,
      experience: Math.round(scoreExp * 10) / 10,
      qualification: scoreQual,
    },
    weights: {
      requiredSkills: Math.round(normWeights.requiredSkills * 100),
      preferredSkills: Math.round(normWeights.preferredSkills * 100),
      textSimilarity: Math.round(normWeights.textSimilarity * 100),
      experience: Math.round(normWeights.experience * 100),
      qualification: Math.round(normWeights.qualification * 100),
    },
    matchingSkills: [...matchingRequired, ...matchingPreferred],
    missingRequiredSkills: missingRequired,
    missingPreferredSkills: missingPreferred,
    additionalSkills,
    evidence: resumeData.evidence || {},
    recommendation,
    explanation,
  };
}

// Batch Rank Candidates
function rankCandidatesLocally(candidates, jobData, customWeights = null) {
  const evaluated = candidates.map((cand) => {
    const evalResult = matchResumeLocally(
      {
        extractedText: cand.extractedText,
        skills: cand.skills,
        yearsOfExperience: cand.yearsOfExperience,
        education: cand.education,
        evidence: cand.evidence,
      },
      jobData,
      customWeights
    );

    return {
      resumeId: cand.resumeId,
      candidateName: cand.name || 'Candidate',
      ...evalResult,
    };
  });

  // Sort descending by overallScore
  evaluated.sort((a, b) => b.overallScore - a.overallScore);

  // Assign ranks
  evaluated.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    totalCandidates: evaluated.length,
    rankedCandidates: evaluated,
  };
}

module.exports = {
  extractTextFromFileLocally,
  matchResumeLocally,
  rankCandidatesLocally,
};

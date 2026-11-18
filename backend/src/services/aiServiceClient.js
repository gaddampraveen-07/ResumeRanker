const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const {
  extractTextFromFileLocally,
  matchResumeLocally,
  rankCandidatesLocally,
} = require('./localNlpEngine');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends a PDF or DOCX file to the Python AI service for text extraction and NLP parsing.
 * Automatically falls back to built-in native NLP engine if python microservice is not reachable.
 */
const extractTextFromFile = async (filePath, originalFileName) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), originalFileName);

    const response = await axios.post(`${AI_SERVICE_URL}/extract-text`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 3000,
      maxContentLength: 50 * 1024 * 1024,
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error('Unexpected response format from AI extraction service');
  } catch (err) {
    console.warn(`[AI Service Client] Python service offline (${err.message}). Using native NLP parser for ${originalFileName}.`);
    return await extractTextFromFileLocally(filePath, originalFileName);
  }
};

/**
 * Evaluates a single candidate resume against a job description.
 * Automatically falls back to built-in native NLP matcher if python microservice is not reachable.
 */
const matchResume = async (resumeData, jobData, weights) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/match-resume`,
      {
        resume: resumeData,
        job: jobData,
        weights: weights || undefined,
      },
      { timeout: 3000 }
    );

    return response.data.evaluation;
  } catch (err) {
    console.warn(`[AI Service Client] Python service offline (${err.message}). Using native NLP matching engine.`);
    return matchResumeLocally(resumeData, jobData, weights);
  }
};

/**
 * Ranks an array of candidates against a job description in a single batch.
 * Automatically falls back to built-in native ranking engine if python microservice is not reachable.
 */
const rankCandidates = async (candidates, jobData, weights) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/rank-candidates`,
      {
        candidates,
        job: jobData,
        weights: weights || undefined,
      },
      { timeout: 5000 }
    );

    return response.data;
  } catch (err) {
    console.warn(`[AI Service Client] Python service offline (${err.message}). Using native batch ranking engine.`);
    return rankCandidatesLocally(candidates, jobData, weights);
  }
};

module.exports = {
  extractTextFromFile,
  matchResume,
  rankCandidates,
};


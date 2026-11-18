import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization header if JWT token is stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('talent_rank_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData (file uploads), let browser automatically set multipart boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
          config.headers.delete('content-type');
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        localStorage.removeItem('talent_rank_token');
        localStorage.removeItem('talent_rank_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  seedDemo: (options) => api.post('/auth/seed-demo', options || {}),
};

export const jobApi = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJob: (jobId) => api.get(`/jobs/${jobId}`),
  createJob: (jobData) => api.post('/jobs', jobData),
  updateJob: (jobId, jobData) => api.put(`/jobs/${jobId}`, jobData),
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`),
};

export const resumeApi = {
  uploadResumes: (jobId, formData, onUploadProgress) =>
    api.post(`/jobs/${jobId}/resumes`, formData, {
      onUploadProgress,
      timeout: 120000,
    }),
  getResumes: (jobId) => api.get(`/jobs/${jobId}/resumes`),
  getResume: (resumeId) => api.get(`/resumes/${resumeId}`),
  getDownloadUrl: (resumeId) => `${API_BASE_URL}/resumes/${resumeId}/download`,
  deleteResume: (resumeId) => api.delete(`/resumes/${resumeId}`),
  reprocessResume: (resumeId) => api.post(`/resumes/${resumeId}/reprocess`),
  loadSampleResumes: (jobId) => api.post(`/jobs/${jobId}/load-sample-resumes`),
};

export const rankingApi = {
  getRankings: (jobId, params) => api.get(`/jobs/${jobId}/rankings`, { params }),
  triggerRanking: (jobId, customWeights) =>
    api.post(`/jobs/${jobId}/rank`, { customWeights }),
  getCandidateAnalysis: (jobId, candidateId) =>
    api.get(`/jobs/${jobId}/candidates/${candidateId}/analysis`),
  compareCandidates: (jobId, candidateIds) =>
    api.post(`/jobs/${jobId}/candidates/compare`, { candidateIds }),
  updateReviewStatus: (candidateId, reviewStatus, notes) =>
    api.patch(`/candidates/${candidateId}/review`, { reviewStatus, notes }),
  addRecruiterNote: (candidateId, notes) =>
    api.post(`/candidates/${candidateId}/notes`, { notes }),
  updateShortlistThreshold: (jobId, threshold, autoApply = true) =>
    api.put(`/jobs/${jobId}/shortlist-threshold`, { threshold, autoApply }),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getJobAnalytics: (jobId) => api.get(`/analytics/jobs/${jobId}`),
};

export default api;

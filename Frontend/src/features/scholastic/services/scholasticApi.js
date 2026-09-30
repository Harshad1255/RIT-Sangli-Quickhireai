import { api } from '../../../shared/services/api';

/**
 * Scholastic Practice Module API Client
 */
export const scholasticApi = {
  // --- Aptitude Endpoints ---
  getAptitudeCategories: () => api.get('/aptitude/categories'),
  getAptitudeQuestions: (params) => api.get('/aptitude/questions', { params }),
  getAptitudeQuestionById: (id) => api.get(`/aptitude/questions/${id}`),
  submitAptitudeAnswer: (data) => api.post('/aptitude/submit', data),
  getRandomAptitudeQuestion: (params) => api.get('/aptitude/questions/random', { params }),
  savePracticeSetAnswer: (attemptId, data) => api.post(`/aptitude/attempts/${attemptId}/answers`, data),
  getPracticeSets: (params) => api.get('/aptitude/practice-sets', { params }),
  getPracticeSetById: (id) => api.get(`/aptitude/practice-sets/${id}`),
  startPracticeSet: (id) => api.post(`/aptitude/practice-sets/${id}/start`),
  submitPracticeSet: (attemptId, data) => api.post(`/aptitude/attempts/${attemptId}/submit`, data),
  getPracticeSetResult: (attemptId) => api.get(`/aptitude/attempts/${attemptId}/result`),

  // --- Coding Endpoints ---
  getCodingTopics: () => api.get('/coding/problems/topics'),
  getCodingQuestions: (params) => api.get('/coding/problems', { params }),
  getCodingQuestionById: (id) => api.get(`/coding/problems/${id}`),
  runCodingSolution: (problemId, data) => api.post(`/coding/problems/${problemId}/run`, data),
  submitCodingSolution: (problemId, data) => api.post(`/coding/problems/${problemId}/submit`, data),
  getCodingSubmissions: (problemId) => api.get('/coding/submissions/mine', { params: { problemId } }),

  // --- General Scholastic / Gamification / Analytics Endpoints ---
  getCompanies: () => api.get('/scholastic/companies'),
  getLeaderboard: (params) => api.get('/scholastic/leaderboard', { params }),
  getProgress: () => api.get('/scholastic/progress'),
  getBookmarks: (params) => api.get('/scholastic/bookmarks', { params }),
  toggleBookmark: (data) => api.post('/scholastic/bookmark', data),

  // --- Mock Tests ---
  getMockTests: (params) => api.get('/scholastic/mocktests', { params }),
  getMockTestById: (id) => api.get(`/scholastic/mocktests/${id}`),
  submitMockTest: (id, data) => api.post(`/scholastic/mocktests/${id}/submit`, data),
  getMockTestAnalysis: (attemptId) => api.get(`/scholastic/mocktests/attempts/${attemptId}/analysis`),

  // --- Contests ---
  getContests: () => api.get('/scholastic/contests'),
  registerForContest: (id) => api.post(`/scholastic/contests/${id}/register`),

  // --- Daily Challenge ---
  getDailyChallenge: () => api.get('/scholastic/daily-challenge')
};

export default scholasticApi;

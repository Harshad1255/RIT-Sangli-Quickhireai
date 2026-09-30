import { api } from '../../../shared/services/api';

export const sendOtp = (data) => api.post('/auth/send-otp', data);
export const verifyOtp = (data) => api.post('/auth/verify-otp', data);
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getProfile = (userId) => api.get(`/users/profile/${userId}`); 
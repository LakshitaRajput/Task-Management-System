import axios from 'axios';

const API_BASE = 'https://task-management-system-production-3a84.up.railway.app/api';

const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

// Auth
export const signup = (name, email, password) =>
  axios.post(`${API_BASE}/auth/signup`, { name, email, password });

export const login = (email, password) =>
  axios.post(`${API_BASE}/auth/login`, { email, password });

// Projects
export const getProjects = () =>
  axios.get(`${API_BASE}/projects`, getHeaders());

export const getProjectById = (id) =>
  axios.get(`${API_BASE}/projects/${id}`, getHeaders());

export const createProject = (name, description) =>
  axios.post(`${API_BASE}/projects`, { name, description }, getHeaders());

export const updateProject = (id, data) =>
  axios.patch(`${API_BASE}/projects/${id}`, data, getHeaders());

// Tasks
export const getTasks = () =>
  axios.get(`${API_BASE}/tasks`, getHeaders());

export const createTask = (title, description, project, assignedTo, dueDate) =>
  axios.post(`${API_BASE}/tasks`, { title, description, project, assignedTo, dueDate }, getHeaders());

export const updateTask = (id, data) =>
  axios.patch(`${API_BASE}/tasks/${id}`, data, getHeaders());

export const deleteTask = (id) =>
  axios.delete(`${API_BASE}/tasks/${id}`, getHeaders());

// Dashboard
export const getDashboard = () =>
  axios.get(`${API_BASE}/dashboard`, getHeaders());

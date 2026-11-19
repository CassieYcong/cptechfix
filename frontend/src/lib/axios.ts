import axios from "axios";

let apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  // Sensible default: local dev backend, or production backend when built for prod.
  apiUrl = import.meta.env.PROD
    ? "https://cptechfix.onrender.com/api"
    : "http://localhost:5000/api";
}
// Normalize: ensure the API base URL includes the /api prefix.
if (!/\/api\/?$/.test(apiUrl)) {
  apiUrl = apiUrl.replace(/\/+$/, "") + "/api";
}
const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

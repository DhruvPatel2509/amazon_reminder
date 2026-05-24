import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";
const normalizedBaseUrl =
  apiBaseUrl === "/api"
    ? apiBaseUrl
    : `${apiBaseUrl.replace(/\/$/, "")}${apiBaseUrl.endsWith("/api") ? "" : "/api"}`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export default api;

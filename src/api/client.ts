import axios from "axios";

const api = axios.create();

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login"; // Force a full redirect
    }

    if (error.response?.status === 403) {
      window.location.href = "/login"; // Force a full redirect
    }

    return Promise.reject(error);
  },
);

export default api;

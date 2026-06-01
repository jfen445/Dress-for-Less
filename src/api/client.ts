import axios from "axios";

const api = axios.create();

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.location.href = "/login";
    }
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  },
);

export default api;

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rtams_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  /*
   * Axios labels a POST, PUT or PATCH carrying no body as form-urlencoded,
   * a media type Fastify has no parser for, so the request comes back 415
   * before it ever reaches the route. Send empty JSON instead, which is what
   * the endpoints that take no body already expect.
   */
  const method = config.method?.toLowerCase();
  if (
    config.data == null &&
    (method === 'post' || method === 'put' || method === 'patch')
  ) {
    config.data = {};
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A failed login is also a 401; let the login form show the error instead of reloading.
    const isLoginAttempt = error.config?.url === '/auth/login';
    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem('rtams_token');
      localStorage.removeItem('rtams_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

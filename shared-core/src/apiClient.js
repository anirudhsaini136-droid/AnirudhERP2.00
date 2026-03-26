export function createApiClient({ baseURL, getToken, onUnauthorized, timeoutMs = 10000 }) {
  async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = typeof getToken === "function" ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseURL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      if (res.status === 401 && typeof onUnauthorized === "function") {
        await onUnauthorized(res);
      }
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    get: (path, options = {}) => request(path, { ...options, method: "GET" }),
    post: (path, body, options = {}) => request(path, { ...options, method: "POST", body: JSON.stringify(body || {}) }),
    put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body: JSON.stringify(body || {}) }),
    del: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
  };
}

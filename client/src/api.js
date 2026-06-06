const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('sadhana_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Sadhana
  getItems: () => request('/sadhana/items'),
  getToday: () => request('/sadhana/today'),
  toggleItem: (itemId) => request('/sadhana/toggle', { method: 'POST', body: JSON.stringify({ item_id: itemId }) }),
  getStats: (days = 30) => request(`/sadhana/stats?days=${days}`),
  getTeam: () => request('/sadhana/team'),
  getUserHistory: (userId, days = 7) => request(`/sadhana/history/${userId}?days=${days}`),

  // Notifications
  getVapidKey: () => request('/notifications/vapid-public-key'),
  subscribe: (subscription) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  unsubscribe: () => request('/notifications/unsubscribe', { method: 'POST' }),
  sendReminder: () => request('/notifications/send-reminder', { method: 'POST' }),
};
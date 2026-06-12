const API_BASE = '/api';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('sadhana_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    unauthorizedHandler?.();
  }

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
  acceptCommitment: () => request('/auth/commitment', { method: 'POST' }),

  // Sadhana
  getItems: () => request('/sadhana/items'),
  getToday: () => request('/sadhana/today'),
  setCustomLabel: (itemId, label) => request('/sadhana/custom-label', { method: 'PUT', body: JSON.stringify({ item_id: itemId, label }) }),
  toggleItem: (itemId) => request('/sadhana/toggle', { method: 'POST', body: JSON.stringify({ item_id: itemId }) }),
  completeItem: (itemId) => request('/sadhana/complete', { method: 'POST', body: JSON.stringify({ item_id: itemId }) }),
  getStats: (days = 30) => request(`/sadhana/stats?days=${days}`),
  getMonthStats: (year, month) => request(`/sadhana/stats/month?year=${year}&month=${month}`),
  getProgressRange: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/sadhana/progress/range${qs ? `?${qs}` : ''}`);
  },
  getDaySnapshots: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`/sadhana/snapshots${qs ? `?${qs}` : ''}`);
  },
  saveDaySnapshot: (date, snapshot) => request(`/sadhana/snapshots/${date}`, {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  }),
  getDayState: (date) => request(`/sadhana/day-state/${date}`),
  saveDayState: (date, state) => request(`/sadhana/day-state/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  }),
  getTeam: () => request('/sadhana/team'),
  getUserHistory: (userId, days = 7) => request(`/sadhana/history/${userId}?days=${days}`),
  searchFriends: (q) => request(`/sadhana/friends/search?q=${encodeURIComponent(q)}`),
  listPractitioners: () => request('/sadhana/friends/directory'),
  getFriendRequests: () => request('/sadhana/friends/requests'),
  sendFriendRequest: (userId) => request('/sadhana/friends/request', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  acceptFriendRequest: (requestId) => request('/sadhana/friends/accept', { method: 'POST', body: JSON.stringify({ request_id: requestId }) }),
  declineFriendRequest: (requestId) => request('/sadhana/friends/decline', { method: 'POST', body: JSON.stringify({ request_id: requestId }) }),
  removeFriend: (userId) => request('/sadhana/friends/remove', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  getGroups: () => request('/sadhana/groups'),
  getGroupInvitations: () => request('/sadhana/groups/invitations'),
  createGroup: (name) => request('/sadhana/groups', { method: 'POST', body: JSON.stringify({ name }) }),
  updateGroup: (id, name) => request(`/sadhana/groups/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteGroup: (id) => request(`/sadhana/groups/${id}`, { method: 'DELETE' }),
  inviteToGroup: (groupId, userId) => request(`/sadhana/groups/${groupId}/invite`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  acceptGroupInvitation: (invitationId) => request('/sadhana/groups/invitations/accept', { method: 'POST', body: JSON.stringify({ invitation_id: invitationId }) }),
  declineGroupInvitation: (invitationId) => request('/sadhana/groups/invitations/decline', { method: 'POST', body: JSON.stringify({ invitation_id: invitationId }) }),
  removeGroupMember: (groupId, userId) => request(`/sadhana/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  getNudges: () => request('/sadhana/nudges'),
  getReceivedNudges: () => request('/sadhana/nudges/received'),
  nudgeFriend: (userId) => request('/sadhana/nudge', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  nudgeAllFriends: () => request('/sadhana/nudge-all', { method: 'POST' }),

  // Notifications
  getVapidKey: () => request('/notifications/vapid-public-key'),
  subscribe: (subscription) => request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  unsubscribe: () => request('/notifications/unsubscribe', { method: 'POST' }),
  sendTestNotification: () => request('/notifications/test', { method: 'POST' }),
  sendReminder: () => request('/notifications/send-reminder', { method: 'POST' }),

  getStreakFreezes: () => request('/sadhana/streak-freezes'),
  requestStreakHelp: () => request('/sadhana/streak-freezes/help-request', { method: 'POST' }),
  acceptStreakHelp: (requestId) => request(`/sadhana/streak-freezes/help-requests/${requestId}/accept`, { method: 'POST' }),
  declineStreakHelp: (requestId) => request(`/sadhana/streak-freezes/help-requests/${requestId}/decline`, { method: 'POST' }),
};
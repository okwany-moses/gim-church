import {
  DashboardStats,
  Member,
  Contribution,
  Expenditure,
  Branch,
  CellGroup,
  Event,
  Sermon,
  Hymn,
  AttendanceSession,
  AttendanceRecord,
  MemberStatement,
  Task,
  PrayerRequest,
  BulkSms
} from './types.js';

// Base API URL - Use environment variable if provided (e.g. on Cloudflare Pages), or default to relative '/api'
const metaEnv = (import.meta as any).env || {};
const BASE_URL = metaEnv.VITE_API_URL 
  ? `${metaEnv.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response;
  try {
    response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(`Network Error: Failed to reach the server. Please verify that your backend service is running and accessible. (Error: ${err.message})`);
  }

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error) errMsg = parsed.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      throw new Error(
        'The server returned an HTML page instead of JSON. This typically happens when the frontend is deployed on Cloudflare Pages or another static host, but the backend API URL (VITE_API_URL) is missing, incorrect, or pointing to the wrong domain. Please ensure that VITE_API_URL is configured in your Cloudflare Pages dashboard environment variables to point to your backend (e.g., https://gim-church.onrender.com).'
      );
    }
    throw new Error(`The server returned non-JSON content: ${text.slice(0, 100)}...`);
  }

  try {
    return await response.json() as T;
  } catch (err: any) {
    throw new Error(`Failed to parse response JSON: ${err.message}`);
  }
}

export const api = {
  // Stats
  getStats: () => request<DashboardStats>('/stats'),

  // Members
  getMembers: () => request<Member[]>('/members'),
  createMember: (member: Partial<Member>) => request<{ id: number }>('/members', {
    method: 'POST',
    body: JSON.stringify(member),
  }),
  updateMember: (id: number, member: Partial<Member>) => request<{ success: boolean }>(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(member),
  }),
  deleteMember: (id: number) => request<{ success: boolean }>(`/members/${id}`, {
    method: 'DELETE',
  }),
  bulkDeleteMembers: (ids: number[]) => request<{ success: boolean }>('/members/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),
  importMembers: (list: Partial<Member>[]) => request<{ success: boolean; count: number }>('/members/import', {
    method: 'POST',
    body: JSON.stringify(list),
  }),

  // Contributions
  getContributions: () => request<Contribution[]>('/contributions'),
  createContribution: (contrib: Partial<Contribution>) => request<{ id: number }>('/contributions', {
    method: 'POST',
    body: JSON.stringify(contrib),
  }),
  updateContribution: (id: number, contrib: Partial<Contribution>) => request<{ success: boolean }>(`/contributions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contrib),
  }),
  deleteContribution: (id: number) => request<{ success: boolean }>(`/contributions/${id}`, {
    method: 'DELETE',
  }),
  bulkDeleteContributions: (ids: number[]) => request<{ success: boolean }>('/contributions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),
  importContributions: (list: Partial<Contribution>[]) => request<{ success: boolean; count: number }>('/contributions/import', {
    method: 'POST',
    body: JSON.stringify(list),
  }),

  // Expenditures
  getExpenditures: () => request<Expenditure[]>('/expenditures'),
  createExpenditure: (exp: Partial<Expenditure>) => request<{ id: number }>('/expenditures', {
    method: 'POST',
    body: JSON.stringify(exp),
  }),
  updateExpenditure: (id: number, exp: Partial<Expenditure>) => request<{ success: boolean }>(`/expenditures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(exp),
  }),
  deleteExpenditure: (id: number) => request<{ success: boolean }>(`/expenditures/${id}`, {
    method: 'DELETE',
  }),
  importExpenditures: (list: Partial<Expenditure>[]) => request<{ success: boolean; count: number }>('/expenditures/import', {
    method: 'POST',
    body: JSON.stringify(list),
  }),

  // Branches
  getBranches: () => request<Branch[]>('/branches'),
  createBranch: (branch: Partial<Branch>) => request<{ id: number }>('/branches', {
    method: 'POST',
    body: JSON.stringify(branch),
  }),
  updateBranch: (id: number, branch: Partial<Branch>) => request<{ success: boolean }>(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(branch),
  }),
  deleteBranch: (id: number) => request<{ success: boolean }>(`/branches/${id}`, {
    method: 'DELETE',
  }),

  // Cell Groups
  getCellGroups: () => request<CellGroup[]>('/cell_groups'),
  createCellGroup: (cg: Partial<CellGroup>) => request<{ id: number }>('/cell_groups', {
    method: 'POST',
    body: JSON.stringify(cg),
  }),
  updateCellGroup: (id: number, cg: Partial<CellGroup>) => request<{ success: boolean }>(`/cell_groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cg),
  }),
  deleteCellGroup: (id: number) => request<{ success: boolean }>(`/cell_groups/${id}`, {
    method: 'DELETE',
  }),

  // Events
  getEvents: () => request<Event[]>('/events'),
  createEvent: (ev: Partial<Event>) => request<{ id: number }>('/events', {
    method: 'POST',
    body: JSON.stringify(ev),
  }),
  updateEvent: (id: number, ev: Partial<Event>) => request<{ success: boolean }>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ev),
  }),
  deleteEvent: (id: number) => request<{ success: boolean }>(`/events/${id}`, {
    method: 'DELETE',
  }),

  // Sermons
  getSermons: () => request<Sermon[]>('/sermons'),
  createSermon: (sermon: Partial<Sermon>) => request<{ id: number }>('/sermons', {
    method: 'POST',
    body: JSON.stringify(sermon),
  }),
  updateSermon: (id: number, sermon: Partial<Sermon>) => request<{ success: boolean }>(`/sermons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(sermon),
  }),
  deleteSermon: (id: number) => request<{ success: boolean }>(`/sermons/${id}`, {
    method: 'DELETE',
  }),

  // Hymns
  getHymns: () => request<Hymn[]>('/hymns'),
  createHymn: (hymn: Partial<Hymn>) => request<{ id: number }>('/hymns', {
    method: 'POST',
    body: JSON.stringify(hymn),
  }),
  updateHymn: (id: number, hymn: Partial<Hymn>) => request<{ success: boolean }>(`/hymns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(hymn),
  }),
  deleteHymn: (id: number) => request<{ success: boolean }>(`/hymns/${id}`, {
    method: 'DELETE',
  }),

  // Attendance Sessions & Records
  getAttendanceSessions: () => request<AttendanceSession[]>('/attendance/sessions'),
  getAttendanceRecords: (sessionId: number) => request<AttendanceRecord[]>(`/attendance/records/${sessionId}`),
  createAttendanceSession: (sessionData: { date: string; service_name: string; branch_id: number; records: { member_id: number; status: string }[] }) =>
    request<{ id: number }>('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    }),
  updateAttendanceRecords: (sessionId: number, records: { member_id: number; status: string }[]) =>
    request<{ success: boolean }>(`/attendance/records/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ records }),
    }),
  deleteAttendanceSession: (id: number) => request<{ success: boolean }>(`/attendance/sessions/${id}`, {
    method: 'DELETE',
  }),

  // Backups
  getLatestBackup: () => request<{ timestamp: string }>('/backups/latest'),
  triggerBackup: () => request<{ success: boolean; timestamp: string }>('/backups/trigger', {
    method: 'POST'
  }),

  // Tasks
  getTasks: () => request<Task[]>('/tasks'),
  createTask: (task: Partial<Task>) => request<{ id: number }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(task)
  }),
  updateTask: (id: number, task: Partial<Task>) => request<{ success: boolean }>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task)
  }),
  deleteTask: (id: number) => request<{ success: boolean }>(`/tasks/${id}`, {
    method: 'DELETE'
  }),

  // Prayer Requests
  getPrayerRequests: () => request<PrayerRequest[]>('/prayer-requests'),
  createPrayerRequest: (reqData: Partial<PrayerRequest>) => request<{ id: number }>('/prayer-requests', {
    method: 'POST',
    body: JSON.stringify(reqData)
  }),
  updatePrayerRequestStatus: (id: number, status: string) => request<{ success: boolean }>(`/prayer-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  deletePrayerRequest: (id: number) => request<{ success: boolean }>(`/prayer-requests/${id}`, {
    method: 'DELETE'
  }),

  // Bulk SMS
  getBulkSmsLogs: () => request<BulkSms[]>('/bulk-sms'),
  sendBulkSms: (smsData: { sender: string; message: string; recipients: string[] | string }) => request<{ success: boolean; count: number }>('/bulk-sms', {
    method: 'POST',
    body: JSON.stringify(smsData)
  }),

  // Generic Restore endpoint
  restore: (table: string, records: any[]) => request<{ success: boolean }>('/restore', {
    method: 'POST',
    body: JSON.stringify({ table, records })
  }),

  // Additional Bulk Deletes
  bulkDeleteExpenditures: (ids: number[]) => request<{ success: boolean }>('/expenditures/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),
  bulkDeleteBranches: (ids: number[]) => request<{ success: boolean }>('/branches/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),
  bulkDeleteCellGroups: (ids: number[]) => request<{ success: boolean }>('/cell_groups/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),
  bulkDeleteSessions: (ids: number[]) => request<{ success: boolean }>('/attendance/sessions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),

  // Bulk Status Updates
  bulkUpdateMembersStatus: (ids: number[], status: string) => request<{ success: boolean }>('/members/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status })
  }),
  bulkUpdateExpendituresStatus: (ids: number[], status: string) => request<{ success: boolean }>('/expenditures/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status })
  }),
  bulkUpdatePrayerRequestsStatus: (ids: number[], status: string) => request<{ success: boolean }>('/prayer-requests/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status })
  }),

  // Auth
  register: (data: any) => request<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  login: (data: any) => request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  changePassword: (data: any) => request<any>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Bible
  getBibleChapter: (book: string, chapter: number, translation: string) => 
    request<{ success: boolean; verses: { verse: number; text: string }[] }>(
      `/bible/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}&translation=${encodeURIComponent(translation)}`
    ),
  searchBible: (query: string, translation: string) => 
    request<{ success: boolean; results: { reference: string; text: string; theme: string }[] }>(
      `/bible/search?query=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}`
    ),

  // Database Management
  getDatabaseStatus: () => 
    request<{ type: 'sqlite' | 'postgresql' | 'cloudsql'; persistent: boolean; details: string }>('/database/status'),
  resetDatabase: () => 
    request<{ success: boolean; message: string }>('/database/reset', {
      method: 'POST'
    }),
};

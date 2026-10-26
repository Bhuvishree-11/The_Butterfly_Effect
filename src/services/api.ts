
const API_BASE_URL = 'http://127.0.0.1:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<any>('/dashboard/summary'),
  getApplications: () => request<any[]>('/applications/'),
  getTasks: () => request<any[]>('/tasks/'),
  getReports: () => request<any>('/reports/summary'),

  updateTaskStatus: (id: number, status: string) =>
    request<any>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

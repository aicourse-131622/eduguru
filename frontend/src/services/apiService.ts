/**
 * API Service for EduGuru
 * Handles all HTTP requests to the backend
 */

// Determine the API base URL
const getApiBaseUrl = (): string => {
    // Use environment variable if set, otherwise default to relative path '/api'
    // This allows the Vite proxy (in dev) or Nginx/Express (in prod) to handle routing
    // avoiding CORS and firewall issues with port 3001.
    return import.meta.env.VITE_API_URL || '/api';
};

const API_BASE = getApiBaseUrl();

// Get stored auth token
const getToken = (): string | null => {
    return localStorage.getItem('eduguru_token');
};

// Set auth token
export const setToken = (token: string | null) => {
    if (token) {
        localStorage.setItem('eduguru_token', token);
    } else {
        localStorage.removeItem('eduguru_token');
    }
};

// Default headers with auth
const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

// Generic fetch wrapper with error handling
const fetchApi = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers,
        },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
        setToken(null);
        localStorage.removeItem('eduguru_user');
        // Dispatch event for App to handle logout
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP Error: ${response.status}`);
    }

    return response.json();
};

// ========== AUTH API ==========
export const authApi = {
    login: async (username: string, password: string) => {
        return fetchApi<{ success: boolean; token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    },

    register: async (data: { username: string; password: string; name: string; role?: string }) => {
        return fetchApi<{ success: boolean; token: string; user: any }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getProfile: async () => {
        return fetchApi<any>('/auth/me');
    },

    updateProfile: async (data: { name?: string; avatar?: string; currentPassword?: string; newPassword?: string }) => {
        return fetchApi<any>('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// ========== CLASSES API ==========
export const classesApi = {
    getAll: async () => {
        return fetchApi<any[]>('/classes');
    },

    create: async (data: { id?: string; name: string; grade: number }) => {
        return fetchApi<any>('/classes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    bulkCreate: async (classes: any[]) => {
        return fetchApi<any>('/classes/bulk', {
            method: 'POST',
            body: JSON.stringify({ classes }),
        });
    },

    update: async (id: string, data: { name: string; grade: number }) => {
        return fetchApi<any>(`/classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string) => {
        return fetchApi<any>(`/classes/${id}`, {
            method: 'DELETE',
        });
    },

    deleteAll: async () => {
        return fetchApi<any>('/classes', {
            method: 'DELETE',
        });
    },
};

// ========== STUDENTS API ==========
export const studentsApi = {
    getAll: async (classId?: string) => {
        const query = classId ? `?classId=${classId}` : '';
        return fetchApi<any[]>(`/students${query}`);
    },

    create: async (data: { name: string; nis: string; classId: string }) => {
        return fetchApi<any>('/students', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    bulkCreate: async (students: any[]) => {
        return fetchApi<any>('/students/bulk', {
            method: 'POST',
            body: JSON.stringify({ students }),
        });
    },

    update: async (id: string, data: { name: string; nis: string; classId: string }) => {
        return fetchApi<any>(`/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string) => {
        return fetchApi<any>(`/students/${id}`, {
            method: 'DELETE',
        });
    },

    deleteAll: async () => {
        return fetchApi<any>('/students', {
            method: 'DELETE',
        });
    },
};

// ========== SUBJECTS API ==========
export const subjectsApi = {
    getAll: async () => {
        return fetchApi<string[]>('/subjects');
    },

    create: async (name: string) => {
        return fetchApi<any>('/subjects', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    },

    bulkCreate: async (subjects: string[]) => {
        return fetchApi<any>('/subjects/bulk', {
            method: 'POST',
            body: JSON.stringify({ subjects }),
        });
    },

    delete: async (name: string) => {
        return fetchApi<any>(`/subjects/${encodeURIComponent(name)}`, {
            method: 'DELETE',
        });
    },

    deleteAll: async () => {
        return fetchApi<any>('/subjects', {
            method: 'DELETE',
        });
    },
};

// ========== JOURNALS API ==========
export const journalsApi = {
    getAll: async () => {
        return fetchApi<any[]>('/journals');
    },

    create: async (data: any) => {
        return fetchApi<any>('/journals', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string) => {
        return fetchApi<any>(`/journals/${id}`, {
            method: 'DELETE',
        });
    },
};

// ========== ATTENDANCE API ==========
export const attendanceApi = {
    getAll: async (params?: { classId?: string; date?: string; subject?: string }) => {
        const query = new URLSearchParams();
        if (params?.classId) query.append('classId', params.classId);
        if (params?.date) query.append('date', params.date);
        if (params?.subject) query.append('subject', params.subject);

        const queryString = query.toString();
        return fetchApi<any[]>(`/attendance${queryString ? '?' + queryString : ''}`);
    },

    bulkSave: async (records: any[]) => {
        return fetchApi<any>('/attendance/bulk', {
            method: 'POST',
            body: JSON.stringify({ records }),
        });
    },
};

// ========== SCORES API ==========
export const scoresApi = {
    getAll: async (params?: { classId?: string; subject?: string; type?: string }) => {
        const query = new URLSearchParams();
        if (params?.classId) query.append('classId', params.classId);
        if (params?.subject) query.append('subject', params.subject);
        if (params?.type) query.append('type', params.type);

        const queryString = query.toString();
        return fetchApi<any[]>(`/scores${queryString ? '?' + queryString : ''}`);
    },

    bulkSave: async (scores: any[]) => {
        return fetchApi<any>('/scores/bulk', {
            method: 'POST',
            body: JSON.stringify({ scores }),
        });
    },
};

// ========== COUNSELING API ==========
export const counselingApi = {
    getAll: async (studentId?: string) => {
        const query = studentId ? `?studentId=${studentId}` : '';
        return fetchApi<any[]>(`/counseling${query}`);
    },

    create: async (data: any) => {
        return fetchApi<any>('/counseling', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string) => {
        return fetchApi<any>(`/counseling/${id}`, {
            method: 'DELETE',
        });
    },
};

// ========== DASHBOARD API ==========
export const dashboardApi = {
    getStats: async () => {
        return fetchApi<any>('/dashboard/stats');
    },
};

// ========== AI API ==========
export const aiApi = {
    generateReflection: async (objective: string, activities: string, engagement: string) => {
        return fetchApi<{ text: string }>('/ai/reflection', {
            method: 'POST',
            body: JSON.stringify({ objective, activities, engagement }),
        });
    },

    suggestTeachingMethods: async (topic: string, grade: string) => {
        return fetchApi<{ text: string }>('/ai/teaching-methods', {
            method: 'POST',
            body: JSON.stringify({ topic, grade }),
        });
    },

    generateFollowUp: async (studentName: string, type: string, notes: string) => {
        return fetchApi<{ text: string }>('/ai/follow-up', {
            method: 'POST',
            body: JSON.stringify({ studentName, type, notes }),
        });
    },

    chat: async (message: string, history: { role: string; text: string }[] = []) => {
        return fetchApi<{ text: string }>('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history }),
        });
    },
};

// ========== SYNC API (Legacy Support) ==========
export const syncApi = {
    masterData: async (data: { students?: any[]; classes?: any[]; subjects?: string[] }) => {
        return fetchApi<any>('/sync/master', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

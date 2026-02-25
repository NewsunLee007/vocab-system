const API_STORAGE_KEY = 'xinji_api_base_url';
const DEFAULT_API_BASE_URL = '/api';

function normalizeApiBaseUrl(input) {
    if (!input) return DEFAULT_API_BASE_URL;
    let url = String(input).trim();
    url = url.replace(/\/+$/, '');
    if (!url) return DEFAULT_API_BASE_URL;
    return url;
}

try {
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');
    if (apiParam) {
        localStorage.setItem(API_STORAGE_KEY, normalizeApiBaseUrl(apiParam));
    }
} catch (e) {}

const api = {
    _baseUrl: normalizeApiBaseUrl((() => {
        try {
            return localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE_URL;
        } catch (e) {
            return DEFAULT_API_BASE_URL;
        }
    })()),

    getBaseUrl() {
        return this._baseUrl;
    },

    setBaseUrl(url) {
        const normalized = normalizeApiBaseUrl(url);
        this._baseUrl = normalized;
        try {
            localStorage.setItem(API_STORAGE_KEY, normalized);
        } catch (e) {}
        return normalized;
    },

    clearBaseUrl() {
        this._baseUrl = DEFAULT_API_BASE_URL;
        try {
            localStorage.removeItem(API_STORAGE_KEY);
        } catch (e) {}
        return this._baseUrl;
    },

    _url(path) {
        const base = this.getBaseUrl();
        if (!path) return base;
        const p = path.startsWith('/') ? path : `/${path}`;
        return `${base}${p}`;
    },

    async _readErrorMessage(response, fallback) {
        if (!response) return fallback;
        try {
            const data = await response.json();
            if (data && typeof data.message === 'string') return data.message;
            return fallback;
        } catch (e) {
            try {
                const text = await response.text();
                if (text) return text.slice(0, 200);
            } catch (e2) {}
            return fallback;
        }
    },

    async login(credentials) {
        const response = await fetch(this._url('/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Login failed');
        }
        return response.json();
    },
    
    async register(userData) {
        const token = localStorage.getItem('token');
        const response = await fetch(this._url('/auth/register'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Register failed');
        }
        return response.json();
    },
    
    async changePassword(oldPassword, newPassword) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const url = this._url('/auth/change-password');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const body = JSON.stringify({ oldPassword, newPassword });

        const attempt = (method) => fetch(url, { method, headers, body });

        let response = await attempt('POST');
        if (response.status === 405) {
            response = await attempt('PUT');
        }
        
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Change password failed');
        }
        return response.json();
    },

    async resetPassword(userIds) {
        const token = localStorage.getItem('token');
        const response = await fetch(this._url('/admin/reset-password'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userIds })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Reset password failed');
        }
        return response.json();
    },
    
    async syncPull() {
        const token = localStorage.getItem('token');
        if (!token) return { data: {} };
        
        const response = await fetch(this._url('/sync'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            // If 401, maybe token expired
            if (response.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Session expired');
            }
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Sync pull failed');
        }
        return response.json();
    },
    
    async syncPush(data) {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(this._url('/sync'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Sync push failed');
        }
        return response.json();
    },

    // New API methods for cloud storage of school data
    
    async fetchSchoolData() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const response = await fetch(this._url('/school/data'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
             if (response.status === 404) return null; // No data yet
             const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
             throw new Error(message || 'Fetch school data failed');
        }
        return response.json();
    },

    async updateSchoolData(data) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(this._url('/school/data'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Update school data failed');
        }
        return response.json();
    }
};

window.api = api;

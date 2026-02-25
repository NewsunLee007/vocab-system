const DEFAULT_API_BASE_URL = '/api';

function normalizeApiBaseUrl(input) {
    if (!input) return DEFAULT_API_BASE_URL;
    let url = String(input).trim();
    url = url.replace(/\/+$/, '');
    if (!url) return DEFAULT_API_BASE_URL;
    return url;
}

let initialApiBaseUrl = DEFAULT_API_BASE_URL;
try {
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');
    if (apiParam) initialApiBaseUrl = normalizeApiBaseUrl(apiParam);
} catch (e) {}

const api = {
    _baseUrl: normalizeApiBaseUrl(initialApiBaseUrl),

    getBaseUrl() {
        return this._baseUrl;
    },

    setBaseUrl(url) {
        const normalized = normalizeApiBaseUrl(url);
        this._baseUrl = normalized;
        return normalized;
    },

    clearBaseUrl() {
        this._baseUrl = DEFAULT_API_BASE_URL;
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
            if (data && data.error && typeof data.error.message === 'string') return data.error.message;
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

    async _readSuccessData(response) {
        const data = await response.json();
        if (data && data.success === true && 'data' in data) return data.data;
        return data;
    },

    async login(credentials) {
        const response = await fetch(this._url('/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Login failed');
        }
        return this._readSuccessData(response);
    },

    async logout() {
        const response = await fetch(this._url('/auth/logout'), {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Logout failed');
        }
        return this._readSuccessData(response);
    },

    async me() {
        const response = await fetch(this._url('/auth/me'), {
            credentials: 'include'
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Fetch session failed');
        }
        return this._readSuccessData(response);
    },
    
    async register(userData) {
        const response = await fetch(this._url('/auth/register'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Register failed');
        }
        return this._readSuccessData(response);
    },
    
    async changePassword(oldPassword, newPassword) {
        const url = this._url('/auth/change-password');
        const headers = { 'Content-Type': 'application/json' };
        const body = JSON.stringify({ oldPassword, newPassword });

        const attempt = (method) => fetch(url, { method, headers, body, credentials: 'include' });

        let response = await attempt('POST');
        if (response.status === 405) {
            response = await attempt('PUT');
        }
        
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Change password failed');
        }
        return this._readSuccessData(response);
    },

    async resetPassword(userIds) {
        const response = await fetch(this._url('/admin/reset-password'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ userIds })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Reset password failed');
        }
        return this._readSuccessData(response);
    },
    
    async syncPull() {
        const response = await fetch(this._url('/sync'), {
            credentials: 'include'
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Sync pull failed');
        }
        return this._readSuccessData(response);
    },
    
    async syncPush(data) {
        const response = await fetch(this._url('/sync'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Sync push failed');
        }
        return this._readSuccessData(response);
    },

    // New API methods for cloud storage of school data
    
    async fetchSchoolData() {
        const response = await fetch(this._url('/school/data'), {
            credentials: 'include'
        });
        if (!response.ok) {
             if (response.status === 404) return null; // No data yet
             const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
             throw new Error(message || 'Fetch school data failed');
        }
        return response.json();
    },

    async updateSchoolData(data) {
        const response = await fetch(this._url('/school/data'), {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Update school data failed');
        }
        return this._readSuccessData(response);
    }
};

window.api = api;

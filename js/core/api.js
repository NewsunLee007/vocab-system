const DEFAULT_API_BASE_URL = '/api';
const API_TOKEN_KEY = 'vocab_api_token';

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
    _token: null,

    initToken() {
        try {
            this._token = localStorage.getItem(API_TOKEN_KEY) || null;
        } catch (_e) {
            this._token = null;
        }
    },

    setToken(token) {
        this._token = token || null;
        try {
            if (this._token) {
                localStorage.setItem(API_TOKEN_KEY, this._token);
            } else {
                localStorage.removeItem(API_TOKEN_KEY);
            }
        } catch (_e) {}
    },

    clearToken() {
        this.setToken(null);
    },

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

    _headers(extra = {}) {
        const headers = { ...extra };
        if (this._token) headers.Authorization = `Bearer ${this._token}`;
        return headers;
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
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Login failed');
        }
        const data = await this._readSuccessData(response);
        const token = data?.token || data?.data?.token;
        if (token) this.setToken(token);
        return data;
    },

    async logout() {
        const response = await fetch(this._url('/auth/logout'), {
            method: 'POST',
            headers: this._headers()
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Logout failed');
        }
        this.clearToken();
        return this._readSuccessData(response);
    },

    async me() {
        const response = await fetch(this._url('/auth/me'), {
            headers: this._headers()
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
            headers: this._headers({ 'Content-Type': 'application/json' }),
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
        const headers = this._headers({ 'Content-Type': 'application/json' });
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
        return this._readSuccessData(response);
    },

    async resetPassword(userIds) {
        const response = await fetch(this._url('/admin/reset-password'), {
            method: 'POST',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userIds })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Reset password failed');
        }
        return this._readSuccessData(response);
    },

    /**
     * 重置指定学生密码（教师/教务处权限）
     * @param {string} username - 学生姓名
     * @param {string} className - 班级
     * @param {string} newPassword - 新密码（默认 123456）
     */
    async resetStudentPassword(username, className, newPassword = '123456') {
        const response = await fetch(this._url('/auth/reset-password'), {
            method: 'POST',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ username, className, newPassword })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || '重置密码失败');
        }
        return this._readSuccessData(response);
    },
    
    async syncPull() {
        const response = await fetch(this._url('/sync'), {
            headers: this._headers()
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
            headers: this._headers({ 'Content-Type': 'application/json' }),
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
            headers: this._headers()
        });
        if (!response.ok) {
             if (response.status === 404) return null; // No data yet
             const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
             throw new Error(message || 'Fetch school data failed');
        }
        return this._readSuccessData(response);
    },

    async updateSchoolData(data) {
        const response = await fetch(this._url('/school/data'), {
            method: 'POST',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Update school data failed');
        }
        return this._readSuccessData(response);
    },

    async fetchVocabularies({ keyword = '', page = 1, pageSize = 20 } = {}) {
        const params = new URLSearchParams({
            keyword: String(keyword || ''),
            page: String(page),
            pageSize: String(pageSize)
        });
        const response = await fetch(this._url(`/vocabulary?${params.toString()}`), {
            headers: this._headers()
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Fetch vocabulary failed');
        }
        return this._readSuccessData(response);
    },

    async createVocabulary(payload) {
        const response = await fetch(this._url('/vocabulary'), {
            method: 'POST',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Create vocabulary failed');
        }
        return this._readSuccessData(response);
    },

    async updateVocabulary(id, payload) {
        const response = await fetch(this._url(`/vocabulary/${id}`), {
            method: 'PUT',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Update vocabulary failed');
        }
        return this._readSuccessData(response);
    },

    async deleteVocabulary(id) {
        const response = await fetch(this._url(`/vocabulary/${id}`), {
            method: 'DELETE',
            headers: this._headers()
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Delete vocabulary failed');
        }
        return this._readSuccessData(response);
    },

    // ── 教师账户管理 ──────────────────────────────────────────────────────────

    /** 拉取所有教师账户列表（仅管理员） */
    async fetchTeacherAccounts() {
        const response = await fetch(this._url('/admin/teachers'), {
            headers: this._headers()
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Fetch teachers failed');
        }
        return this._readSuccessData(response);
    },

    /** 创建教师账户（仅管理员） */
    async createTeacherAccount({ username, password }) {
        const response = await fetch(this._url('/admin/teachers'), {
            method: 'POST',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Create teacher failed');
        }
        return this._readSuccessData(response);
    },

    /** 删除教师账户（仅管理员） */
    async deleteTeacherAccount(userId) {
        const response = await fetch(this._url('/admin/teachers'), {
            method: 'DELETE',
            headers: this._headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ userId })
        });
        if (!response.ok) {
            const message = await this._readErrorMessage(response, `Server Error (${response.status}): ${response.statusText}`);
            throw new Error(message || 'Delete teacher failed');
        }
        return this._readSuccessData(response);
    }
};

api.initToken();
window.api = api;

const API_BASE_URL = '/api'; // Relative path since we serve frontend from same server

const api = {
    async login(credentials) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
        return response.json();
    },
    
    async register(userData) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Register failed');
        }
        return response.json();
    },
    
    async changePassword(oldPassword, newPassword) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Change password failed');
        }
        return response.json();
    },

    async resetPassword(userIds) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/admin/reset-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userIds })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Reset password failed');
        }
        return response.json();
    },
    
    async syncPull() {
        const token = localStorage.getItem('token');
        if (!token) return { data: {} };
        
        const response = await fetch(`${API_BASE_URL}/sync`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            // If 401, maybe token expired
            if (response.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Session expired');
            }
            const error = await response.json();
            throw new Error(error.message || 'Sync pull failed');
        }
        return response.json();
    },
    
    async syncPush(data) {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Sync push failed');
        }
        return response.json();
    }
};

window.api = api;

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
    },

    // New API methods for cloud storage of school data
    
    async fetchSchoolData() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const response = await fetch(`${API_BASE_URL}/school/data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
             if (response.status === 404) return null; // No data yet
             const error = await response.json();
             throw new Error(error.message || 'Fetch school data failed');
        }
        return response.json();
    },

    async updateSchoolData(data) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE_URL}/school/data`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ data })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Update school data failed');
        }
        return response.json();
    }
};

window.api = api;

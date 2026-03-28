const vocabularyApiBridge = {
    loading: false,
    error: null,

    _setLoading(value) {
        this.loading = value;
        if (helpers && typeof helpers.showLoading === 'function' && value) {
            helpers.showLoading('正在同步词汇...');
        }
        if (helpers && typeof helpers.hideLoading === 'function' && !value) {
            helpers.hideLoading();
        }
    },

    _setError(error) {
        this.error = error ? String(error.message || error) : null;
        if (this.error && helpers && typeof helpers.showToast === 'function') {
            helpers.showToast(this.error, 'error');
        }
    },

    async list(params = {}) {
        this._setLoading(true);
        this._setError(null);
        try {
            const result = await api.fetchVocabularies(params);
            return result?.items || [];
        } catch (error) {
            this._setError(error);
            return [];
        } finally {
            this._setLoading(false);
        }
    },

    async create(payload) {
        this._setLoading(true);
        this._setError(null);
        try {
            const created = await api.createVocabulary(payload);
            if (helpers && typeof helpers.showToast === 'function') {
                helpers.showToast('词汇创建成功', 'success');
            }
            return created;
        } catch (error) {
            this._setError(error);
            return null;
        } finally {
            this._setLoading(false);
        }
    },

    async update(id, payload) {
        this._setLoading(true);
        this._setError(null);
        try {
            const updated = await api.updateVocabulary(id, payload);
            if (helpers && typeof helpers.showToast === 'function') {
                helpers.showToast('词汇更新成功', 'success');
            }
            return updated;
        } catch (error) {
            this._setError(error);
            return null;
        } finally {
            this._setLoading(false);
        }
    },

    async remove(id) {
        this._setLoading(true);
        this._setError(null);
        try {
            await api.deleteVocabulary(id);
            if (helpers && typeof helpers.showToast === 'function') {
                helpers.showToast('词汇删除成功', 'success');
            }
            return true;
        } catch (error) {
            this._setError(error);
            return false;
        } finally {
            this._setLoading(false);
        }
    }
};

window.vocabularyApiBridge = vocabularyApiBridge;

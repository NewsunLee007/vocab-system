const express = require('express');
const router = express.Router();
const { progress } = require('../models/db');
const { verifyToken } = require('../utils/auth');

// Get User Progress
router.get('/', verifyToken(), async (req, res) => {
    try {
        const userId = req.user.id;
        const userProgress = await progress.findOne({ userId });
        
        if (!userProgress) {
            return res.json({ data: {} }); // Return empty if no progress found
        }
        
        res.json({ data: userProgress.data, timestamp: userProgress.updatedAt });
    } catch (err) {
        res.status(500).json({ message: 'Sync error', error: err.message });
    }
});

// Save User Progress
router.post('/', verifyToken(), async (req, res) => {
    try {
        const userId = req.user.id;
        const { data } = req.body;
        
        if (!data) return res.status(400).json({ message: 'No data provided' });

        // Upsert progress
        const existing = await progress.findOne({ userId });
        
        if (existing) {
            await progress.update(
                { userId },
                { $set: { data, updatedAt: new Date() } }
            );
        } else {
            await progress.insert({
                userId,
                data,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        
        res.json({ message: 'Sync successful', timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ message: 'Sync error', error: err.message });
    }
});

module.exports = router;

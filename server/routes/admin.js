const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, logs } = require('../models/db');
const { verifyToken } = require('../utils/auth');

const DEFAULT_PASSWORD = '123456';

// Get All Users (For Admin/Teacher)
router.get('/users', verifyToken(['admin', 'teacher']), async (req, res) => {
    try {
        const { role, class: className } = req.query;
        const query = {};
        
        if (role) query.role = role;
        if (className) query.className = className;
        
        // Teachers can only see their students
        if (req.user.role === 'teacher') {
            query.role = 'student';
            // Assuming teacher is linked to class or just sees all students for now?
            // The requirement implies "Academic Affairs Admin Console".
            // Teachers might manage their own class.
        }

        const userList = await users.find(query, { password: 0 }); // Exclude password
        res.json(userList);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
});

// Reset Password (Single or Batch)
router.post('/reset-password', verifyToken(['admin', 'teacher']), async (req, res) => {
    try {
        const { userIds } = req.body; // Array of user IDs
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'No users selected.' });
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        
        // Update users
        await users.update(
            { _id: { $in: userIds } },
            { $set: { password: hashedPassword, passwordChanged: false } },
            { multi: true }
        );

        // Log action
        await logs.insert({
            action: 'reset_password_batch',
            operatorId: req.user.id,
            targetIds: userIds,
            count: userIds.length,
            timestamp: new Date()
        });

        res.json({ message: `Successfully reset passwords for ${userIds.length} users.` });
    } catch (err) {
        res.status(500).json({ message: 'Reset error', error: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Datastore = require('nedb-promises');
const path = require('path');
const { verifyToken } = require('../utils/auth');

const dbPath = path.join(__dirname, '../data');
const schoolData = Datastore.create({ filename: path.join(dbPath, 'school_data.db'), autoload: true });

// Get Global School Data (Teachers, Wordlists, Students)
// Accessible by teachers and admins. Students might need read-only access to some parts?
// For now, let's say authenticated users can read.
router.get('/data', verifyToken(), async (req, res) => {
    try {
        // We assume there's one global data object for the school (or maybe per class/teacher?)
        // The user requirement implies a centralized "Academic Affairs" upload.
        // So we store a single document with id 'global_school_data'.
        
        const data = await schoolData.findOne({ _id: 'global_school_data' });
        
        if (!data) {
            return res.status(404).json({ message: 'No school data found' });
        }
        
        // If student, maybe filter sensitive data? 
        // But the requirement says "Teachers log in... read server data... perform calculations".
        // Students also need wordlists.
        // Let's return full data for now, assuming frontend handles display logic.
        // In a real system, we'd query specific collections. But here we are simulating the "JSON file upload" behavior.
        
        res.json({ data: data.content, updatedAt: data.updatedAt });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching school data', error: err.message });
    }
});

// Update Global School Data (Admin/Teacher only)
router.post('/data', verifyToken(['admin', 'teacher']), async (req, res) => {
    try {
        const { data } = req.body;
        if (!data) return res.status(400).json({ message: 'No data provided' });

        // Upsert
        const count = await schoolData.update(
            { _id: 'global_school_data' },
            { _id: 'global_school_data', content: data, updatedAt: new Date(), updatedBy: req.user.id },
            { upsert: true }
        );

        res.json({ message: 'School data updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating school data', error: err.message });
    }
});

module.exports = router;

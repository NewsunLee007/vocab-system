const Datastore = require('nedb-promises');
const path = require('path');

const dbPath = path.join(__dirname, '../data');

// Initialize Databases
const users = Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true });
const progress = Datastore.create({ filename: path.join(dbPath, 'progress.db'), autoload: true });
const tasks = Datastore.create({ filename: path.join(dbPath, 'tasks.db'), autoload: true });
const logs = Datastore.create({ filename: path.join(dbPath, 'logs.db'), autoload: true });
const wordlists = Datastore.create({ filename: path.join(dbPath, 'wordlists.db'), autoload: true });

const bcrypt = require('bcryptjs');

// Ensure Indexes for Performance
async function initIndexes() {
    try {
        await users.ensureIndex({ fieldName: 'username' });
        await progress.ensureIndex({ fieldName: 'user_id' });
        await tasks.ensureIndex({ fieldName: 'teacher_id' });
        await logs.ensureIndex({ fieldName: 'user_id' });
        
        console.log('Database indexes initialized.');
        
        // Initialize default admin if not exists
        const admin = await users.findOne({ username: 'admin' });
        if (!admin) {
            const hashedPassword = await bcrypt.hash('root', 10);
            await users.insert({
                username: 'admin',
                role: 'admin',
                password: hashedPassword,
                passwordChanged: false,
                createdAt: new Date()
            });
            console.log('Default admin account created (admin/root).');
        }
    } catch (err) {
        console.error('Failed to initialize database:', err);
    }
}

initIndexes();

module.exports = {
    users,
    progress,
    tasks,
    logs,
    wordlists
};

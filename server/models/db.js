const Datastore = require('nedb-promises');
const path = require('path');

const dbPath = path.join(__dirname, '../data');

// Initialize Databases
const users = Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true });
const progress = Datastore.create({ filename: path.join(dbPath, 'progress.db'), autoload: true });
const tasks = Datastore.create({ filename: path.join(dbPath, 'tasks.db'), autoload: true });
const logs = Datastore.create({ filename: path.join(dbPath, 'logs.db'), autoload: true });
const wordlists = Datastore.create({ filename: path.join(dbPath, 'wordlists.db'), autoload: true });

// Ensure Indexes for Performance
async function initIndexes() {
    try {
        await users.ensureIndex({ fieldName: 'username' });
        // Composite index is not directly supported by NeDB ensureIndex, but we can query by both fields.
        // However, ensuring uniqueness for (username + class) is tricky. We'll handle it in logic.
        
        await progress.ensureIndex({ fieldName: 'user_id' });
        await tasks.ensureIndex({ fieldName: 'teacher_id' });
        await logs.ensureIndex({ fieldName: 'user_id' });
        
        console.log('Database indexes initialized.');
    } catch (err) {
        console.error('Failed to initialize indexes:', err);
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

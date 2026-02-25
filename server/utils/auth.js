const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vocab-secret-key-2026';

// Middleware to verify JWT token
const verifyToken = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'No token provided' });

        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Invalid token format' });

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; // { id, role, username, className }
            
            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Insufficient permissions' });
            }
            
            next();
        } catch (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
    };
};

module.exports = {
    verifyToken
};

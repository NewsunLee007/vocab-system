const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { fail } = require('../utils/response');

function getTokenFromReq(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  if (req.cookies && req.cookies[config.cookieName]) return req.cookies[config.cookieName];
  return null;
}

function requireAuth() {
  return (req, res, next) => {
    const token = getTokenFromReq(req);
    if (!token) return fail(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = payload;
      return next();
    } catch (e) {
      return fail(res, 401, 'UNAUTHENTICATED', 'Invalid session');
    }
  };
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
    if (!allowed.includes(req.user.role)) return fail(res, 403, 'FORBIDDEN', 'Forbidden');
    return next();
  };
}

module.exports = { requireAuth, requireRole };


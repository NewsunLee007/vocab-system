const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username,
      className: user.className || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

async function getAuthUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user || null;
  } catch (_e) {
    return null;
  }
}

async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, 10);
}

async function verifyPassword(rawPassword, passwordHash) {
  return bcrypt.compare(rawPassword, passwordHash);
}

module.exports = {
  signToken,
  getAuthUser,
  hashPassword,
  verifyPassword,
};

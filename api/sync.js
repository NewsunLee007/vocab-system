const { ok, methodNotAllowed } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return ok(res, { data: null });
  if (req.method === 'POST') return ok(res, { saved: true });
  return methodNotAllowed(req, res, ['GET', 'POST']);
};

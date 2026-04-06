function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(status).json(payload);
}

function ok(res, data) {
  send(res, 200, { success: true, data });
}

function created(res, data) {
  send(res, 201, { success: true, data });
}

function fail(res, status, message, details) {
  send(res, status, {
    success: false,
    error: {
      message,
      details: details || undefined,
    },
  });
}

function methodNotAllowed(req, res, allowed = []) {
  res.setHeader('Allow', allowed);
  return fail(res, 405, `Method ${req.method} Not Allowed`);
}

module.exports = { ok, created, fail, methodNotAllowed };

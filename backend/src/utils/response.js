function ok(res, data = null, meta = undefined) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.json(body);
}

function fail(res, status, code, message, details = undefined) {
  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

module.exports = { ok, fail };


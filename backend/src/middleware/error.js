const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', 'Not Found');
}

function errorMiddleware(err, req, res, next) {
  const status = Number(err.statusCode || err.status || 500);
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'Internal Server Error';
  const details = err.details;

  if (status >= 500) {
    console.error(err);
  }

  return fail(res, status, code, message, details);
}

module.exports = { notFound, errorMiddleware };


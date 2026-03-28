const { fail } = require('../utils/response');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    if (!result.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Validation failed', result.error.flatten());
    }
    req.validated = result.data;
    return next();
  };
}

module.exports = { validate };


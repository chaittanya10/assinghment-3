function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error.';
  let details;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((item) => item.message);
    message = 'Product validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `A product with this ${field} already exists.`;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message, ...(details ? { details } : {}) });
}

module.exports = { notFound, errorHandler };


function errorHandler(err, req, res, next) {
  console.error('[MMOS_ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })

  const status = err.status || err.statusCode || 500
  res.status(status).json({
    ok: false,
    error: err.message || 'Interner Serverfehler',
    code: err.code || 'INTERNAL_ERROR'
  })
}

module.exports = errorHandler

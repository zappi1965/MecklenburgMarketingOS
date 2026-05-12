
function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: 'Route nicht gefunden' })
}

function errorMiddleware(error, req, res, next) {
  console.error('[MMOS ERROR]', error)
  res.status(error.status || 500).json({
    ok: false,
    error: error.message || 'Interner Serverfehler'
  })
}

module.exports = { notFound, errorMiddleware }

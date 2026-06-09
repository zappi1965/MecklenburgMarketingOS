
const http = require('http')
const url = process.env.HEALTHCHECK_URL || `http://localhost:${process.env.PORT || 4000}/api/system/health`
http.get(url, res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))

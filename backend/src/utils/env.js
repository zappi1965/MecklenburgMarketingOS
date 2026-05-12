
function getRequiredEnv(keys = []) {
  return keys.reduce((acc, key) => {
    acc[key] = process.env[key] || ''
    return acc
  }, {})
}

function missingEnv(keys = []) {
  return keys.filter((key) => !process.env[key])
}

module.exports = { getRequiredEnv, missingEnv }

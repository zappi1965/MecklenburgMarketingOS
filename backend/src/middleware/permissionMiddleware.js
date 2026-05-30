const { assertCan, requestUser } = require('../services/permissionService')

function permissionMiddleware({ action = 'read', resourceType, customerIdFrom = 'body' } = {}) {
  return function (req, res, next) {
    try {
      const user = requestUser(req)
      const source = customerIdFrom === 'query' ? req.query : customerIdFrom === 'params' ? req.params : req.body
      const customer_id = source?.customer_id || source?.customerId || req.params?.customer_id || req.query?.customer_id
      assertCan(user, action, resourceType, { customer_id })
      next()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = permissionMiddleware

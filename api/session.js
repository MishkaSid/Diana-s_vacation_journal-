const { isAuthenticated } = require('../lib/auth');
const { methodNotAllowed, withErrorHandling } = require('../lib/http');

function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  res.status(200).json({ authenticated: isAuthenticated(req) });
}

module.exports = withErrorHandling(handler);

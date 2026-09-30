const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  // Let jwt.verify throw its original errors so callers can inspect error.name
  return jwt.verify(token, JWT_SECRET);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.user.id = req.user.id || req.user._id;
    next();
  } catch (error) {
    // Distinguish expired tokens so frontend can attempt refresh on 401
    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (error && error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const authorizeCompany = (req, res, next) => {
  if (req.user.userType !== 'company') {
    return res.status(403).json({ success: false, error: 'Company access required' });
  }
  next();
};

const authorizeCandidate = (req, res, next) => {
  if (req.user.userType !== 'candidate') {
    return res.status(403).json({ success: false, error: 'Candidate access required' });
  }
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authorizeCompany,
  authorizeCandidate
}; 
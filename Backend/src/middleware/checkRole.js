const checkRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = checkRole;
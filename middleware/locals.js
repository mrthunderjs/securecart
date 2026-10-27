module.exports = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = req.session.user ? req.app.locals.db.prepare('SELECT COALESCE(SUM(quantity),0) count FROM cart WHERE user_id=?').get(req.session.user.id).count : 0;
  res.locals.currentPath = req.path;
  next();
};

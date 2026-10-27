function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).render('error', { title: 'Forbidden', message: 'Administrator access is required.' });
  next();
}
module.exports = { requireAuth, requireAdmin };

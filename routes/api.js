const express = require('express');
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/products', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const pattern = `%${q}%`;
  const products = db.prepare("SELECT p.*, c.name category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE (? = '' OR p.name LIKE ? OR p.description LIKE ?) ORDER BY p.id DESC LIMIT ? OFFSET ?")
    .all(q, pattern, pattern, limit, (page - 1) * limit);
  res.json({ data: products, page, limit });
});
router.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?').get(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ data: product });
});
router.get('/categories', (req, res) => res.json({ data: db.prepare('SELECT * FROM categories ORDER BY name').all() }));
router.get('/cart', requireAuth, (req, res) => res.json({ data: db.prepare('SELECT c.quantity,p.* FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?').all(req.session.user.id) }));
router.post('/cart', requireAuth, (req, res) => {
  const product = db.prepare('SELECT id,stock FROM products WHERE id=?').get(Number(req.body.productId));
  const quantity = Math.max(1, Math.min(99, Number(req.body.quantity) || 1));
  if (!product || product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });
  db.prepare('INSERT INTO cart(user_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=MIN(quantity+excluded.quantity,?)')
    .run(req.session.user.id, product.id, quantity, product.stock);
  res.status(201).json({ message: 'Cart updated' });
});
router.get('/orders', requireAuth, (req, res) => res.json({ data: db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(req.session.user.id) }));
router.get('/users/me', requireAuth, (req, res) => res.json({ data: db.prepare('SELECT id,name,email,role,address,created_at FROM users WHERE id=?').get(req.session.user.id) }));

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();
const valid = (req) => validationResult(req).isEmpty();

router.get('/', (req,res) => {
  const q = String(req.query.q || '').trim().slice(0,100), category = Number(req.query.category) || 0;
  const page = Math.max(1, Number(req.query.page) || 1), limit = 12, offset = (page-1)*limit;
  const where = [], params = [];
  if (q) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`,`%${q}%`); }
  if (category) { where.push('p.category_id=?'); params.push(category); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const products = db.prepare(`SELECT p.*,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id ${clause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`).all(...params,limit,offset);
  const total = db.prepare(`SELECT COUNT(*) count FROM products p ${clause}`).get(...params).count;
  res.render('home',{title:'Shop',products,categories:db.prepare('SELECT * FROM categories ORDER BY name').all(),q,page,pages:Math.ceil(total/limit)});
});
router.get('/products/:slug', (req,res) => {
  const product=db.prepare('SELECT p.*,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE p.slug=?').get(req.params.slug);
  if (!product) return res.status(404).render('error',{title:'Not Found',message:'Product not found.'});
  const related=db.prepare('SELECT * FROM products WHERE category_id=? AND id!=? LIMIT 4').all(product.category_id,product.id);
  res.render('product',{title:product.name,product,related,reviews:db.prepare('SELECT r.*,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.id DESC').all(product.id)});
});
router.get('/categories/:slug', (req,res) => { const cat=db.prepare('SELECT * FROM categories WHERE slug=?').get(req.params.slug); if(!cat)return res.status(404).render('error',{title:'Not Found',message:'Category not found.'}); res.redirect(`/?category=${cat.id}`); });
router.post('/cart/add/:id', requireAuth, (req,res) => { const id=Number(req.params.id), p=db.prepare('SELECT id,stock FROM products WHERE id=?').get(id); if(!p||p.stock<1)return res.status(400).json({error:'Product unavailable'}); db.prepare('INSERT INTO cart(user_id,product_id,quantity) VALUES(?,?,1) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=MIN(quantity+1,?)').run(req.session.user.id,id,p.stock); res.redirect(req.get('referer')||'/'); });
router.get('/cart',requireAuth,(req,res)=>res.render('cart',{title:'Your Cart',items:db.prepare('SELECT c.quantity,p.* FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?').all(req.session.user.id)}));
router.post('/cart/update/:id',requireAuth,(req,res)=>{const qty=Math.max(0,Math.min(99,Number(req.body.quantity)||0)); if(qty)db.prepare('UPDATE cart SET quantity=? WHERE user_id=? AND product_id=?').run(qty,req.session.user.id,Number(req.params.id));else db.prepare('DELETE FROM cart WHERE user_id=? AND product_id=?').run(req.session.user.id,Number(req.params.id));res.redirect('/cart');});
router.post('/cart/remove/:id',requireAuth,(req,res)=>{db.prepare('DELETE FROM cart WHERE user_id=? AND product_id=?').run(req.session.user.id,Number(req.params.id));res.redirect('/cart');});
router.get('/checkout',requireAuth,(req,res)=>res.render('checkout',{title:'Checkout',items:db.prepare('SELECT c.quantity,p.* FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?').all(req.session.user.id)}));
router.post('/checkout',requireAuth,body('address').trim().isLength({min:8,max:300}), (req,res)=>{if(!valid(req))return res.status(400).render('error',{title:'Invalid checkout',message:'Please enter a valid shipping address.'});const items=db.prepare('SELECT c.quantity,p.* FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?').all(req.session.user.id);if(!items.length)return res.redirect('/cart');const total=items.reduce((s,i)=>s+i.price*i.quantity,0);const order=db.prepare('INSERT INTO orders(user_id,total,shipping_address) VALUES(?,?,?)').run(req.session.user.id,total,req.body.address);const add=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES(?,?,?,?,?)');const reduce=db.prepare('UPDATE products SET stock=stock-? WHERE id=?');for(const i of items){add.run(order.lastInsertRowid,i.id,i.name,i.quantity,i.price);reduce.run(i.quantity,i.id);}db.prepare('DELETE FROM cart WHERE user_id=?').run(req.session.user.id);res.redirect(`/orders/${order.lastInsertRowid}/success`);});
router.get('/orders/:id/success',requireAuth,(req,res)=>{const order=db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(Number(req.params.id),req.session.user.id);if(!order)return res.status(404).render('error',{title:'Not Found',message:'Order not found.'});res.render('success',{title:'Order confirmed',order});});
router.get('/dashboard',requireAuth,(req,res)=>res.render('dashboard',{title:'My Dashboard',orders:db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(req.session.user.id)}));
router.post('/profile',requireAuth,body('name').trim().isLength({min:2,max:80}),body('address').trim().isLength({max:300}), (req,res)=>{if(!valid(req))return res.status(400).render('error',{title:'Invalid profile',message:'Please check your details.'});db.prepare('UPDATE users SET name=?,address=? WHERE id=?').run(req.body.name,req.body.address,req.session.user.id);req.session.user.name=req.body.name;res.redirect('/dashboard');});
router.post('/contact',body('name').trim().isLength({min:2,max:80}),body('email').isEmail(),body('subject').trim().isLength({min:2,max:120}),body('message').trim().isLength({min:10,max:2000}),(req,res)=>{if(!valid(req))return res.status(400).render('error',{title:'Invalid message',message:'Please complete all fields correctly.'});db.prepare('INSERT INTO messages(name,email,subject,message) VALUES(?,?,?,?)').run(req.body.name,req.body.email,req.body.subject,req.body.message);res.render('success',{title:'Message sent',order:null});});
router.get('/contact',(req,res)=>res.render('contact',{title:'Contact'}));
router.get('/admin',requireAdmin,(req,res)=>res.render('admin',{title:'Admin Dashboard',stats:{users:db.prepare('SELECT COUNT(*) count FROM users').get().count,products:db.prepare('SELECT COUNT(*) count FROM products').get().count,orders:db.prepare('SELECT COUNT(*) count FROM orders').get().count,revenue:db.prepare('SELECT COALESCE(SUM(total),0) total FROM orders').get().total}}));
router.get('/admin/products',requireAdmin,(req,res)=>res.render('admin-products',{title:'Manage Products',products:db.prepare('SELECT p.*,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC').all(),categories:db.prepare('SELECT * FROM categories').all()}));
router.post('/admin/products',requireAdmin,upload.single('image'),body('name').trim().isLength({min:2,max:150}),body('price').isFloat({min:0}),body('stock').isInt({min:0}), (req,res)=>{if(!valid(req))return res.status(400).render('error',{title:'Invalid product',message:'Please check product fields.'});const slug=req.body.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now();db.prepare('INSERT INTO products(category_id,name,slug,description,price,stock,image) VALUES(?,?,?,?,?,?,?)').run(Number(req.body.category_id),req.body.name,slug,req.body.description,Number(req.body.price),Number(req.body.stock),req.file?`/uploads/${req.file.filename}`:'https://picsum.photos/seed/new/640/480');res.redirect('/admin/products');});
router.post('/admin/products/:id/delete',requireAdmin,(req,res)=>{db.prepare('DELETE FROM products WHERE id=?').run(Number(req.params.id));res.redirect('/admin/products');});
module.exports=router;

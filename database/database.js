const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 address TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, name TEXT NOT NULL,
 slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL, price REAL NOT NULL CHECK(price >= 0),
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0), image TEXT DEFAULT '', rating REAL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS cart (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity > 0), UNIQUE(user_id, product_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, total REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', shipping_address TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
 product_name TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL,
 message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL, UNIQUE(user_id,product_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired INTEGER NOT NULL);
`);

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (count === 0) {
    const addCategory = db.prepare('INSERT INTO categories(name,slug) VALUES(?,?)');
    ['Electronics', 'Home & Living', 'Fashion', 'Sports', 'Books'].forEach((name) =>
      addCategory.run(name, name.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')));
  }
  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (productCount === 0) {
    const cats = db.prepare('SELECT id,name FROM categories').all();
    const add = db.prepare('INSERT INTO products(category_id,name,slug,description,price,stock,image,rating) VALUES(?,?,?,?,?,?,?,?)');
    for (let i = 1; i <= 100; i++) {
      const cat = cats[(i - 1) % cats.length];
      const name = `${cat.name} Essential ${i}`;
      add.run(cat.id, name, `product-${i}`, `A carefully selected ${cat.name.toLowerCase()} product designed for modern everyday life.`, (19 + (i * 13.47) % 280).toFixed(2), 8 + (i * 7) % 90, `https://picsum.photos/seed/securecart-${i}/640/480`, (3.5 + (i % 15) / 10).toFixed(1));
    }
  }
  const admin = db.prepare('SELECT id FROM users WHERE email=?').get('admin@securecart.com');
  if (!admin) db.prepare('INSERT INTO users(name,email,password,role,address) VALUES(?,?,?,?,?)').run('SecureCart Admin','admin@securecart.com',bcrypt.hashSync('Admin@123', 12),'admin','');
  const user = db.prepare('SELECT id FROM users WHERE email=?').get('user@securecart.com');
  if (!user) db.prepare('INSERT INTO users(name,email,password,address) VALUES(?,?,?,?)').run('Demo User','user@securecart.com',bcrypt.hashSync('User@123', 12),'123 Commerce Street');
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const addUser = db.prepare('INSERT INTO users(name,email,password,address) VALUES(?,?,?,?)');
  for (let i = userCount; i < 21; i++) addUser.run(`Demo User ${i}`, `user${i}@securecart.com`, bcrypt.hashSync(`User${i}@123`, 10), '');
}
seed();
module.exports = db;

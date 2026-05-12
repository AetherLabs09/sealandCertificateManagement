const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = 'seal_license_secret_key_2024';

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      real_name: user.real_name,
      department: user.department,
      role: user.role
    }
  });
});

router.post('/register', (req, res) => {
  const { username, password, real_name, department, phone, email } = req.body;
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password, real_name, department, phone, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, hashedPassword, real_name, department, phone, email);
  
  res.json({ id: result.lastInsertRowid, message: '注册成功' });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: '未登录' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, real_name, department, role, phone, email FROM users WHERE id = ?').get(decoded.id);
    res.json(user);
  } catch (e) {
    res.status(401).json({ message: 'token无效' });
  }
});

module.exports = router;

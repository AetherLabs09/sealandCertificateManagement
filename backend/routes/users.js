const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');

router.get('/', (req, res) => {
  const { role, department } = req.query;
  let sql = 'SELECT id, username, real_name, department, role, phone, email, created_at FROM users WHERE 1=1';
  const params = [];
  
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (department) {
    sql += ' AND department LIKE ?';
    params.push(`%${department}%`);
  }
  
  sql += ' ORDER BY created_at DESC';
  const users = db.prepare(sql).all(...params);
  res.json(users);
});

router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, real_name, department, role, phone, email, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  res.json(user);
});

router.put('/:id', (req, res) => {
  const { real_name, department, role, phone, email } = req.body;
  
  db.prepare(`
    UPDATE users SET real_name=?, department=?, role=?, phone=?, email=?, updated_at=CURRENT_TIMESTAMP 
    WHERE id=?
  `).run(real_name, department, role, phone, email, req.params.id);
  
  res.json({ message: '更新成功' });
});

router.put('/:id/password', (req, res) => {
  const { old_password, new_password } = req.body;
  
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  const isValid = bcrypt.compareSync(old_password, user.password);
  if (!isValid) {
    return res.status(400).json({ message: '原密码错误' });
  }
  
  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hashedPassword, req.params.id);
  
  res.json({ message: '密码修改成功' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;

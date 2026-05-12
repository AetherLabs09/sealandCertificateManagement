const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

const uploadDir = path.join(__dirname, '..', 'uploads', 'seals');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `seal_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  const { name, type, status } = req.query;
  let sql = 'SELECT * FROM seals WHERE 1=1';
  const params = [];
  
  if (name) {
    sql += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  const seals = db.prepare(sql).all(...params);
  res.json(seals);
});

router.get('/:id', (req, res) => {
  const seal = db.prepare('SELECT * FROM seals WHERE id = ?').get(req.params.id);
  if (!seal) {
    return res.status(404).json({ message: '印章不存在' });
  }
  res.json(seal);
});

router.post('/', upload.single('imprint'), (req, res) => {
  const { name, type, keeper_name, start_date, location, remark } = req.body;
  const imprint_path = req.file ? `/uploads/seals/${req.file.filename}` : null;
  
  const result = db.prepare(`
    INSERT INTO seals (name, type, keeper_name, start_date, location, imprint_path, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, keeper_name, start_date, location, imprint_path, remark);
  
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

router.put('/:id', upload.single('imprint'), (req, res) => {
  const { name, type, keeper_name, start_date, location, status, remark } = req.body;
  let imprint_path = null;
  
  if (req.file) {
    imprint_path = `/uploads/seals/${req.file.filename}`;
  }
  
  let sql = 'UPDATE seals SET name=?, type=?, keeper_name=?, start_date=?, location=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP';
  const params = [name, type, keeper_name, start_date, location, status, remark];
  
  if (imprint_path) {
    sql += ', imprint_path=?';
    params.push(imprint_path);
  }
  
  sql += ' WHERE id=?';
  params.push(req.params.id);
  
  db.prepare(sql).run(...params);
  res.json({ message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM seals WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;

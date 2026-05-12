const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

const uploadDir = path.join(__dirname, '..', 'uploads', 'licenses');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `license_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  const { name, status, department } = req.query;
  let sql = 'SELECT * FROM licenses WHERE 1=1';
  const params = [];
  
  if (name) {
    sql += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  
  sql += ' ORDER BY created_at DESC';
  const licenses = db.prepare(sql).all(...params);
  res.json(licenses);
});

router.get('/:id', (req, res) => {
  const license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(req.params.id);
  if (!license) {
    return res.status(404).json({ message: '证照不存在' });
  }
  res.json(license);
});

router.post('/', upload.single('file'), (req, res) => {
  const { name, license_no, issuer, issue_date, expiry_date, department, remark } = req.body;
  const file_path = req.file ? `/uploads/licenses/${req.file.filename}` : null;
  
  const result = db.prepare(`
    INSERT INTO licenses (name, license_no, issuer, issue_date, expiry_date, department, file_path, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, license_no, issuer, issue_date, expiry_date, department, file_path, remark);
  
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

router.put('/:id', upload.single('file'), (req, res) => {
  const { name, license_no, issuer, issue_date, expiry_date, department, status, remark } = req.body;
  let file_path = null;
  
  if (req.file) {
    file_path = `/uploads/licenses/${req.file.filename}`;
  }
  
  let sql = 'UPDATE licenses SET name=?, license_no=?, issuer=?, issue_date=?, expiry_date=?, department=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP';
  const params = [name, license_no, issuer, issue_date, expiry_date, department, status, remark];
  
  if (file_path) {
    sql += ', file_path=?';
    params.push(file_path);
  }
  
  sql += ' WHERE id=?';
  params.push(req.params.id);
  
  db.prepare(sql).run(...params);
  res.json({ message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM licenses WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

router.get('/expiring/list', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const licenses = db.prepare(`
    SELECT * FROM licenses 
    WHERE date(expiry_date) <= date('now', '+' || ? || ' days')
    AND date(expiry_date) >= date('now')
    AND status = 'valid'
    ORDER BY expiry_date ASC
  `).all(days);
  res.json(licenses);
});

module.exports = router;

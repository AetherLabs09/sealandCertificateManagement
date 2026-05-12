const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/seals', (req, res) => {
  const { status, borrower_id } = req.query;
  let sql = `SELECT sb.*, s.name as seal_name, u.real_name as borrower_name 
    FROM seal_borrows sb 
    LEFT JOIN seals s ON sb.seal_id = s.id 
    LEFT JOIN users u ON sb.borrower_id = u.id 
    WHERE 1=1`;
  const params = [];
  
  if (status) {
    sql += ' AND sb.status = ?';
    params.push(status);
  }
  if (borrower_id) {
    sql += ' AND sb.borrower_id = ?';
    params.push(borrower_id);
  }
  
  sql += ' ORDER BY sb.created_at DESC';
  const borrows = db.prepare(sql).all(...params);
  res.json(borrows);
});

router.post('/seals', (req, res) => {
  const { seal_id, borrower_id, borrow_time, purpose, return_deadline, remark } = req.body;
  
  const seal = db.prepare('SELECT name FROM seals WHERE id = ?').get(seal_id);
  const user = db.prepare('SELECT real_name FROM users WHERE id = ?').get(borrower_id);
  
  const result = db.prepare(`
    INSERT INTO seal_borrows (seal_id, seal_name, borrower_id, borrower_name, borrow_time, purpose, return_deadline, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(seal_id, seal?.name, borrower_id, user?.real_name, borrow_time, purpose, return_deadline, remark);
  
  res.json({ id: result.lastInsertRowid, message: '借出登记成功' });
});

router.put('/seals/:id/return', (req, res) => {
  const { return_time, remark } = req.body;
  
  db.prepare(`
    UPDATE seal_borrows SET status='returned', actual_return_time=?, remark=?, updated_at=CURRENT_TIMESTAMP 
    WHERE id=?
  `).run(return_time, remark, req.params.id);
  
  res.json({ message: '归还登记成功' });
});

router.get('/licenses', (req, res) => {
  const { status, borrower_id } = req.query;
  let sql = `SELECT lb.*, l.name as license_name, u.real_name as borrower_name 
    FROM license_borrows lb 
    LEFT JOIN licenses l ON lb.license_id = l.id 
    LEFT JOIN users u ON lb.borrower_id = u.id 
    WHERE 1=1`;
  const params = [];
  
  if (status) {
    sql += ' AND lb.status = ?';
    params.push(status);
  }
  if (borrower_id) {
    sql += ' AND lb.borrower_id = ?';
    params.push(borrower_id);
  }
  
  sql += ' ORDER BY lb.created_at DESC';
  const borrows = db.prepare(sql).all(...params);
  res.json(borrows);
});

router.post('/licenses', (req, res) => {
  const { license_id, borrower_id, borrow_time, remark } = req.body;
  
  const license = db.prepare('SELECT name FROM licenses WHERE id = ?').get(license_id);
  const user = db.prepare('SELECT real_name FROM users WHERE id = ?').get(borrower_id);
  
  const result = db.prepare(`
    INSERT INTO license_borrows (license_id, license_name, borrower_id, borrower_name, borrow_time, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(license_id, license?.name, borrower_id, user?.real_name, borrow_time, remark);
  
  res.json({ id: result.lastInsertRowid, message: '借出登记成功' });
});

router.put('/licenses/:id/return', (req, res) => {
  const { return_time, remark } = req.body;
  
  db.prepare(`
    UPDATE license_borrows SET status='returned', return_time=?, remark=?, updated_at=CURRENT_TIMESTAMP 
    WHERE id=?
  `).run(return_time, remark, req.params.id);
  
  res.json({ message: '归还登记成功' });
});

router.get('/overdue', (req, res) => {
  const overdueSeals = db.prepare(`
    SELECT sb.*, s.name as seal_name, u.real_name as borrower_name 
    FROM seal_borrows sb 
    LEFT JOIN seals s ON sb.seal_id = s.id 
    LEFT JOIN users u ON sb.borrower_id = u.id 
    WHERE sb.status = 'borrowed' AND datetime(sb.return_deadline) < datetime('now')
  `).all();
  
  res.json(overdueSeals);
});

module.exports = router;

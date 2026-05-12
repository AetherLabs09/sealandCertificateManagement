const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { status, applicant_id, seal_id } = req.query;
  let sql = `SELECT sa.*, s.name as seal_name, u.real_name as applicant_name 
    FROM seal_applications sa 
    LEFT JOIN seals s ON sa.seal_id = s.id 
    LEFT JOIN users u ON sa.applicant_id = u.id 
    WHERE 1=1`;
  const params = [];
  
  if (status) {
    sql += ' AND sa.status = ?';
    params.push(status);
  }
  if (applicant_id) {
    sql += ' AND sa.applicant_id = ?';
    params.push(applicant_id);
  }
  if (seal_id) {
    sql += ' AND sa.seal_id = ?';
    params.push(seal_id);
  }
  
  sql += ' ORDER BY sa.created_at DESC';
  const applications = db.prepare(sql).all(...params);
  res.json(applications);
});

router.get('/:id', (req, res) => {
  const application = db.prepare(`
    SELECT sa.*, s.name as seal_name, u.real_name as applicant_name 
    FROM seal_applications sa 
    LEFT JOIN seals s ON sa.seal_id = s.id 
    LEFT JOIN users u ON sa.applicant_id = u.id 
    WHERE sa.id = ?
  `).get(req.params.id);
  
  if (!application) {
    return res.status(404).json({ message: '申请不存在' });
  }
  
  const flows = db.prepare(`
    SELECT af.*, u.real_name as approver_name 
    FROM approval_flows af 
    LEFT JOIN users u ON af.approver_id = u.id 
    WHERE af.application_id = ? AND af.application_type = 'seal'
    ORDER BY af.node_order ASC
  `).all(req.params.id);
  
  res.json({ ...application, flows });
});

router.post('/', (req, res) => {
  const { seal_id, applicant_id, reason, file_name, copies, scene } = req.body;
  
  const seal = db.prepare('SELECT name FROM seals WHERE id = ?').get(seal_id);
  const user = db.prepare('SELECT real_name FROM users WHERE id = ?').get(applicant_id);
  
  const result = db.prepare(`
    INSERT INTO seal_applications (seal_id, seal_name, applicant_id, applicant_name, reason, file_name, copies, scene)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(seal_id, seal?.name, applicant_id, user?.real_name, reason, file_name, copies, scene);
  
  res.json({ id: result.lastInsertRowid, message: '申请提交成功' });
});

router.put('/:id/approve', (req, res) => {
  const { approver_id, action, comment, next_node } = req.body;
  const applicationId = req.params.id;
  
  const application = db.prepare('SELECT * FROM seal_applications WHERE id = ?').get(applicationId);
  if (!application) {
    return res.status(404).json({ message: '申请不存在' });
  }
  
  const approver = db.prepare('SELECT real_name FROM users WHERE id = ?').get(approver_id);
  
  db.prepare(`
    INSERT INTO approval_flows (application_id, application_type, node_order, approver_id, approver_name, action, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(applicationId, 'seal', application.current_node, approver_id, approver?.real_name, action, comment);
  
  if (action === 'approve') {
    const totalNodes = db.prepare('SELECT COUNT(*) as count FROM approval_nodes').get();
    if (application.current_node >= totalNodes.count) {
      db.prepare('UPDATE seal_applications SET status = ?, current_node = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('approved', application.current_node + 1, applicationId);
    } else {
      db.prepare('UPDATE seal_applications SET current_node = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(application.current_node + 1, applicationId);
    }
  } else if (action === 'reject') {
    db.prepare('UPDATE seal_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('rejected', applicationId);
  }
  
  res.json({ message: '审批完成' });
});

router.put('/:id', (req, res) => {
  const { reason, file_name, copies, scene } = req.body;
  db.prepare(`
    UPDATE seal_applications SET reason=?, file_name=?, copies=?, scene=?, status='pending', current_node=1, updated_at=CURRENT_TIMESTAMP 
    WHERE id=?
  `).run(reason, file_name, copies, scene, req.params.id);
  res.json({ message: '修改成功' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM seal_applications WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM approval_flows WHERE application_id = ? AND application_type = ?').run(req.params.id, 'seal');
  res.json({ message: '删除成功' });
});

module.exports = router;

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'seal_license.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    real_name TEXT NOT NULL,
    department TEXT,
    role TEXT DEFAULT 'employee',
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    keeper_id INTEGER,
    keeper_name TEXT,
    start_date DATE,
    location TEXT,
    imprint_path TEXT,
    status TEXT DEFAULT 'active',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    license_no TEXT,
    issuer TEXT,
    issue_date DATE,
    expiry_date DATE,
    department TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'valid',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seal_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seal_id INTEGER NOT NULL,
    seal_name TEXT,
    applicant_id INTEGER NOT NULL,
    applicant_name TEXT,
    reason TEXT NOT NULL,
    file_name TEXT,
    copies INTEGER DEFAULT 1,
    scene TEXT,
    status TEXT DEFAULT 'pending',
    current_node INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approval_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    application_type TEXT NOT NULL,
    node_order INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    approver_name TEXT,
    action TEXT,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approval_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_order INTEGER NOT NULL,
    node_name TEXT NOT NULL,
    role_required TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seal_borrows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seal_id INTEGER NOT NULL,
    seal_name TEXT,
    borrower_id INTEGER NOT NULL,
    borrower_name TEXT,
    borrow_time DATETIME NOT NULL,
    purpose TEXT NOT NULL,
    return_deadline DATETIME NOT NULL,
    actual_return_time DATETIME,
    status TEXT DEFAULT 'borrowed',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS license_borrows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    license_name TEXT,
    borrower_id INTEGER NOT NULL,
    borrower_name TEXT,
    borrow_time DATETIME NOT NULL,
    return_time DATETIME,
    status TEXT DEFAULT 'borrowed',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    reference_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const initAdmin = () => {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password, real_name, department, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', '信息部', 'admin');
  }
};

const initApprovalNodes = () => {
  const nodesExist = db.prepare('SELECT id FROM approval_nodes').get();
  if (!nodesExist) {
    const nodes = [
      { node_order: 1, node_name: '部门负责人审批', role_required: 'dept_leader' },
      { node_order: 2, node_name: '行政管理审批', role_required: 'admin' },
      { node_order: 3, node_name: '财务审批', role_required: 'finance' },
      { node_order: 4, node_name: '高层领导审批', role_required: 'leader' }
    ];
    const stmt = db.prepare('INSERT INTO approval_nodes (node_order, node_name, role_required) VALUES (?, ?, ?)');
    nodes.forEach(node => stmt.run(node.node_order, node.node_name, node.role_required));
  }
};

const initSampleData = () => {
  const sealExists = db.prepare('SELECT id FROM seals').get();
  if (!sealExists) {
    const seals = [
      { name: '公司公章', type: 'official', keeper_name: '张三', start_date: '2020-01-01', location: '行政部保险柜A1' },
      { name: '法人章', type: 'legal', keeper_name: '李四', start_date: '2020-01-01', location: '财务部保险柜B2' },
      { name: '财务专用章', type: 'finance', keeper_name: '王五', start_date: '2020-01-01', location: '财务部保险柜B3' },
      { name: '合同专用章', type: 'contract', keeper_name: '赵六', start_date: '2020-01-01', location: '法务部保险柜C1' }
    ];
    const stmt = db.prepare('INSERT INTO seals (name, type, keeper_name, start_date, location) VALUES (?, ?, ?, ?, ?)');
    seals.forEach(s => stmt.run(s.name, s.type, s.keeper_name, s.start_date, s.location));
  }

  const licenseExists = db.prepare('SELECT id FROM licenses').get();
  if (!licenseExists) {
    const licenses = [
      { name: '营业执照', license_no: '91110000000000000X', issuer: '北京市市场监督管理局', issue_date: '2020-01-15', expiry_date: '2050-01-14', department: '行政部' },
      { name: '资质证书', license_no: 'ZS2020001', issuer: '住建部', issue_date: '2020-06-01', expiry_date: '2025-05-31', department: '资质部' },
      { name: '安全生产许可证', license_no: 'AQ2020001', issuer: '应急管理部', issue_date: '2020-03-01', expiry_date: '2023-02-28', department: '安全部' }
    ];
    const stmt = db.prepare('INSERT INTO licenses (name, license_no, issuer, issue_date, expiry_date, department) VALUES (?, ?, ?, ?, ?, ?)');
    licenses.forEach(l => stmt.run(l.name, l.license_no, l.issuer, l.issue_date, l.expiry_date, l.department));
  }
};

initAdmin();
initApprovalNodes();
initSampleData();

module.exports = db;

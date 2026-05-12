const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth');
const sealRoutes = require('./routes/seals');
const licenseRoutes = require('./routes/licenses');
const applicationRoutes = require('./routes/applications');
const borrowRoutes = require('./routes/borrows');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/seals', sealRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

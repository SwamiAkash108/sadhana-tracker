const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb, initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const auth = require('./routes/auth');
const sadhana = require('./routes/sadhana');
const notifications = require('./routes/notifications');

app.use('/api/auth', auth.router);
app.use('/api/sadhana', sadhana);
app.use('/api/notifications', notifications);

app.get('/api/health', async (req, res) => {
  try {
    const db = getDb();
    await db.execute('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

(async () => {
  try {
    await initSchema();
    console.log('Database initialized.');
  } catch (err) {
    console.error('Database init failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Sadhana Tracker running on port ${PORT}`);
  });
})();
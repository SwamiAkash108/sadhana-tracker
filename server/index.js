require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

getDb();

const auth = require('./routes/auth');
const sadhana = require('./routes/sadhana');
const notifications = require('./routes/notifications');

app.use('/api/auth', auth.router);
app.use('/api/sadhana', sadhana);
app.use('/api/notifications', notifications);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
  console.log('Serving static frontend from', clientDist);
} else {
  console.log('Frontend not built yet. Run: cd client && npm run build');
  app.get('/', (req, res) => {
    res.json({ message: 'Sadhana Tracker API running. Build frontend for full app.' });
  });
}

app.listen(PORT, () => {
  console.log(`Sadhana Tracker server running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);

  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn('\n⚠️  Push notifications not configured. To enable:');
    console.warn('   1. Run: cd server && npx web-push generate-vapid-keys');
    console.warn('   2. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars\n');
  }
});
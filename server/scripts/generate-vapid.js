const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('Add these to server/.env (and Render environment variables):\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:your-email@example.com');

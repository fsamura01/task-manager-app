const https = require('https');

const data = JSON.stringify({
  username: "testuser22",
  email: "test22@test.com",
  password: "password123",
  name: "Test User 22"
});

const options = {
  hostname: 'task-manager-api-8uzs.onrender.com',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', error => { console.error(error); });
req.write(data);
req.end();

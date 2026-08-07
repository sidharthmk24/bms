const http = require('http');

http.get('http://localhost:3000/api/v1/auth/me', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data.slice(0, 100)));
});

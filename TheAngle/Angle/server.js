const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 8000;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((request, response) => {
  const cleanPath = decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '');
  const filePath = path.resolve(root, cleanPath || 'index.html');

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    response.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`The Angle Africa is running at http://localhost:${port}/Admin.html`);
  console.log('Keep this window open while using the site.');
});

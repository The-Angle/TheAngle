const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 8000;
const host = process.env.HOST || '127.0.0.1';
const dataDir = path.join(root, 'data');
const postsFile = path.join(dataDir, 'admin-posts.json');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf'
};

const server = http.createServer((request, response) => {
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (request.url.split('?')[0] === '/api/posts') {
    if (request.method === 'GET') {
      fs.readFile(postsFile, 'utf8', (error, data) => {
        if (error && error.code !== 'ENOENT') {
          response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ error: 'Could not read posts.' }));
          return;
        }

        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(error ? '[]' : data || '[]');
      });
      return;
    }

    if (request.method === 'PUT') {
      let body = '';
      request.on('data', chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
          request.destroy();
        }
      });

      request.on('end', () => {
        let posts;

        try {
          posts = JSON.parse(body || '[]');
          if (!Array.isArray(posts)) throw new Error('Posts must be an array.');
        } catch (error) {
          response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ error: 'Invalid posts payload.' }));
          return;
        }

        fs.mkdir(dataDir, { recursive: true }, mkdirError => {
          if (mkdirError) {
            response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            response.end(JSON.stringify({ error: 'Could not prepare data folder.' }));
            return;
          }

          fs.writeFile(postsFile, JSON.stringify(posts, null, 2), 'utf8', writeError => {
            if (writeError) {
              response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              response.end(JSON.stringify({ error: 'Could not save posts.' }));
              return;
            }

            response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            response.end(JSON.stringify({ ok: true }));
          });
        });
      });
      return;
    }

    response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

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
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`The Angle Africa is running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/Admin.html`);
  console.log('Keep this window open while using the site.');
});

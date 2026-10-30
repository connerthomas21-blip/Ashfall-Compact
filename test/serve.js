// Tiny static server so tests load the game exactly as published (index.html + js/*.js).
const http = require('http'), fs = require('fs'), path = require('path');
module.exports = () => new Promise(res => {
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.md': 'text/markdown', '.json': 'application/json' };
  const srv = http.createServer((req, rsp) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(f, (err, data) => {
      if (err) { rsp.writeHead(404); return rsp.end(); }
      let body = data;
      // The published page is wrapped in a document skeleton; add one locally.
      if (f.endsWith('index.html')) body = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' + data;
      rsp.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); rsp.end(body);
    });
  }).listen(0, () => res({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
});

import { buildApp } from '../server/dist/app.js';

let app;

async function getApp() {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body || undefined));
  });
}

export default async function handler(req, res) {
  const fastify = await getApp();
  const body = await readBody(req);

  const response = await fastify.inject({
    method: req.method,
    url: req.url,
    headers: req.headers,
    payload: body,
  });

  res.writeHead(response.statusCode, response.headers);
  res.end(response.body);
}

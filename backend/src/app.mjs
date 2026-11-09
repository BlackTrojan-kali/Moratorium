import {rolesRoute} from './roles.mjs';
import { actorRoute } from './actors.mjs';
import { paymentRoute } from './payments.mjs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { authRoute, fail } from './auth.mjs';
import { depositRoute } from './deposits.mjs';
import { requestRoute } from './requests.mjs';
import { dashboardRoute } from './dashboard.mjs';

export function createApp({ db, corsOrigin = 'http://localhost:5173', logger = console, secureCookies = process.env.NODE_ENV === 'production' }) {
  return createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    if (req.headers.origin === corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, If-Match, Idempotency-Key');
    }
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/v1/health') {
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
        if (req.method !== 'GET') { res.setHeader('Allow', 'GET, OPTIONS'); return send(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', requestId } }); }
        await db.query('SELECT 1'); return send(200, { status: 'ok', service: 'moratorium-api' });
      }
      const roleEndpoint=/^\/api\/v1\/admin\/roles\/[^/]+\/permissions$/.test(path);
      const actorEndpoint = /^\/api\/v1\/admin\/centres(\/|$)/.test(path) || /^\/api\/v1\/(settings|audit|reports|exports|correspondence|help)(\/|$)/.test(path) || /^\/api\/v1\/admin\/(roles|config|reference-data|templates|workflow-rules)$/.test(path);
      const paymentEndpoint = /^\/api\/v1\/payment-plans(\/|$)/.test(path);
      const businessRoute = /^\/api\/v1\/(requests|deposits|documents|notifications)(\/|$)/.test(path) || path === '/api/v1/employer' || path === '/api/v1/workflow/staff' || path === '/api/v1/dashboard';
      if (!actorEndpoint && !paymentEndpoint && !businessRoute && !path.startsWith('/api/v1/auth/') && !path.startsWith('/api/v1/admin/')) fail(404, 'Route not found.');
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) fail(405, 'Method not allowed.');
      let body = {};
      if (['POST','PUT','DELETE'].includes(req.method)) {
        // Browser writes must come from the exact configured frontend origin.
        if (req.headers.origin !== corsOrigin) fail(403, 'Untrusted request origin.');
        if (req.method !== 'DELETE' && req.headers['content-type']?.split(';')[0] !== 'application/json') fail(415, 'Send application/json.');
        let size = 0; const chunks = [];
        const limit = /^\/api\/v1\/(?:requests|deposits)\/[a-f0-9-]{36}\/documents$/.test(path) ? 7100000 : path.endsWith('/schedule') ? 100000 : 16384;
        for await (const chunk of req) { size += chunk.length; if (size > limit) fail(413, 'Request is too large.'); chunks.push(chunk); }
        try { body = req.method==='DELETE' ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Invalid JSON.'); }
        if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'Send a JSON object.');
      }
      if(roleEndpoint) return await rolesRoute({db,req,path,send});
      else if(actorEndpoint) return await actorRoute({db,req,res,path,body,send});
      else if(paymentEndpoint) return await paymentRoute({db,req,res,path,body,send});
      else if (/^\/api\/v1\/deposits(\/|$)/.test(path)) return await depositRoute({db,req,res,path,body,send});
      else if (path === '/api/v1/dashboard' && req.method === 'GET') {
        return await dashboardRoute({db,req,send});
      }
      else if (businessRoute) return await requestRoute({ db, req, res, path, body, send });
      // Notifications are served by requestRoute (businessRoute, above).
      else return await authRoute({ db, req, res, path, body, send, secureCookies });
    } catch (error) {
      const status = error.status || (error.code === '23505' ? 409 : 503);
      if (status >= 500) logger.error({ requestId, code: error.code || 'DATABASE_ERROR' });
      if (status === 429) res.setHeader('Retry-After', '900');
      send(status, { error: { code: status === 503 ? 'SERVICE_UNAVAILABLE' : `HTTP_${status}`, message: error.status ? error.message : status === 409 ? 'Email or CNPS number already exists.' : 'Service unavailable', requestId } });
    }
  });
}

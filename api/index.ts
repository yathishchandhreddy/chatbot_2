import app from '../server';

export default function handler(req: any, res: any) {
  // Set CORS headers for Vercel serverless invocation
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // On Vercel, handler in /api/index.ts is strictly invoked for /api/* routes.
  // Normalize req.url if /api prefix was stripped by serverless router.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }

  return app(req, res);
}


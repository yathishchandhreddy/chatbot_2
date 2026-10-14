import app from '../server';

export default function handler(req: any, res: any) {
  // Set CORS headers for Vercel serverless invocation
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Restore true requested URL if rewritten by Vercel
  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }

  return app(req, res);
}


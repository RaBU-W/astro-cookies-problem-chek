import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4321';
const cookieName = 'astro_backend_cookie';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

app.post('/api/cookie', (_request, response) => {
  const cookieValue = `cookie-from-backend-${Date.now()}`;

  response.cookie(cookieName, cookieValue, {
    httpOnly: true,
    maxAge: 1000 * 60 * 10,
    sameSite: 'lax',
  });

  response.json({
    message: 'Cookie saved by backend.',
    cookieName,
    cookieValue,
  });
});

app.get('/api/cookie', (request, response) => {
  const cookieValue = parseCookieHeader(request.headers.cookie ?? '')[cookieName] ?? null;

  response.json({
    message: cookieValue ? 'Cookie read by backend.' : 'Cookie not found.',
    cookieName,
    cookieValue,
  });
});

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log(`CORS enabled for ${frontendOrigin}`);
});

function parseCookieHeader(cookieHeader) {
  return cookieHeader.split(';').reduce((cookies, cookiePair) => {
    const [rawName, ...rawValueParts] = cookiePair.trim().split('=');

    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join('='));
    return cookies;
  }, {});
}

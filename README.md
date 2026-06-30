# Astro Cookie Backend Demo

A tiny Astro frontend plus a separately hosted Express backend that demonstrates a cookie round trip with CORS credentials.

## Run locally

Install dependencies:

```bash
npm install
```

Start the backend on `http://localhost:3001` and the Astro frontend on `http://localhost:4321`:

```bash
npm run dev:all
```

Open `http://localhost:4321`, click **Save cookie via backend**, and wait 3 seconds. The frontend asks the backend to save an HTTP-only cookie, then asks the backend to read that cookie and print the value.

## Test the full browser flow

The E2E test starts both hosts, opens the Astro page in Chromium, clicks the button, waits for the 3-second backend read, asserts the cookie value appears in the UI, and saves a screenshot to `test-artifacts/cookie-flow.png`.

```bash
npm run test:e2e
```

## Configuration

- `FRONTEND_ORIGIN` controls which frontend origin the backend allows for credentialed CORS requests. Default: `http://localhost:4321`.
- `PORT` controls the backend port. Default: `3001`.
- `PUBLIC_BACKEND_URL` controls the backend URL used by Astro browser code. Default: `http://localhost:3001`.

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://localhost:4321';
const backendUrl = process.env.PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
const screenshotPath = process.env.E2E_SCREENSHOT_PATH ?? 'test-artifacts/cookie-flow.png';

const processes = [];

try {
  const backend = startProcess('npm', ['run', 'dev:backend'], 'backend');
  const frontend = startProcess('npm', ['run', 'dev'], 'frontend');

  processes.push(backend, frontend);

  await Promise.all([waitForUrl(`${backendUrl}/health`), waitForUrl(frontendUrl)]);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(frontendUrl);
  await page.getByRole('button', { name: 'Save cookie via backend' }).click();
  await page.getByText('Backend read cookie after 3 seconds:').waitFor({ timeout: 8000 });

  const output = await page.locator('#output').innerText();
  if (!/cookie-from-backend-\d+/.test(output)) {
    throw new Error(`Expected backend cookie value in page output, received: ${output}`);
  }

  const cookies = await context.cookies(backendUrl);
  const backendCookie = cookies.find((cookie) => cookie.name === 'astro_backend_cookie');
  if (!backendCookie?.value || !/^cookie-from-backend-\d+$/.test(backendCookie.value)) {
    throw new Error(`Expected astro_backend_cookie in browser context, received: ${JSON.stringify(cookies)}`);
  }

  await mkdir(screenshotPath.split('/').slice(0, -1).join('/'), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  console.log(`Cookie flow passed. Page output: ${output}`);
  console.log(`Screenshot saved to ${screenshotPath}`);
} finally {
  await Promise.all(processes.map(stopProcess));
}

function startProcess(command, args, name) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`));

  return child;
}

async function waitForUrl(url) {
  const deadline = Date.now() + 15000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function stopProcess(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  killProcessGroup(child, 'SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(3000).then(() => killProcessGroup(child, 'SIGKILL')),
  ]);
}

function killProcessGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

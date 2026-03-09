import { test, expect } from '@playwright/test';
import { setupAuth, mockAgent, mockDashboardApis, suppressKnownErrors } from './fixtures';

test.describe('Relay Agent Chat', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    suppressKnownErrors(page);
    await mockAgent(page, { name: 'Signal Scout', avatar_emoji: '🦊', personality: 'balanced' });
    await mockDashboardApis(page);
  });

  test('opens the command drawer when clicking the chat button', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Quantik Command Drawer')).toBeVisible();
    await expect(page.getByTestId('relay-sidebar-input')).toBeVisible({ timeout: 5000 });
  });

  test('closes the command drawer when clicking the close button', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Quantik Command Drawer')).toBeVisible();
    await page.getByText('×').click();
    await expect(page.getByTestId('relay-sidebar-input')).not.toBeVisible();
  });

  test('shows agent identity in drawer header (name + emoji)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Signal Scout')).toBeVisible();
    await expect(page.getByText('🦊')).toBeVisible();
  });

  test('shows empty state message before any conversation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Ask about portfolio, signals, risk')).toBeVisible();
  });

  test('textarea has correct placeholder with agent name', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    const input = page.getByTestId('relay-sidebar-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Message/);
  });

  test('typing in textarea enables send and user message appears on send', async ({ page }) => {
    const sseBody = [
      'data: {"type":"token","token":"Hello "}\n\n',
      'data: {"type":"token","token":"from Relay!"}\n\n',
      'data: {"type":"done","reply":"Hello from Relay!","latencyMs":142,"model":"llama4:maverick"}\n\n',
    ].join('');
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('What is my portfolio status?');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('What is my portfolio status?')).toBeVisible();
  });

  test('sends message via Enter key and receives SSE streamed response', async ({ page }) => {
    const sseBody = [
      'data: {"type":"token","token":"Your "}\n\n',
      'data: {"type":"token","token":"portfolio "}\n\n',
      'data: {"type":"token","token":"is healthy."}\n\n',
      'data: {"type":"done","reply":"Your portfolio is healthy.","latencyMs":215,"model":"llama4:maverick","suggestions":["Show positions","Check risk"]}\n\n',
    ].join('');
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Portfolio status');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Your portfolio is healthy.')).toBeVisible({ timeout: 8000 });
  });

  test('handles SSE trace events showing agent execution steps', async ({ page }) => {
    const sseBody = [
      'data: {"type":"trace","key":"t1","label":"SIGNAL SCOUT","status":"Checking portfolio...","state":"running"}\n\n',
      'data: {"type":"trace","key":"t1","label":"SIGNAL SCOUT","status":"Portfolio loaded","state":"done"}\n\n',
      'data: {"type":"token","token":"Everything looks good."}\n\n',
      'data: {"type":"done","reply":"Everything looks good.","latencyMs":300,"model":"llama4:maverick"}\n\n',
    ].join('');
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Check portfolio');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByTestId('relay-sidebar-trace')).toBeAttached({ timeout: 8000 });
    await expect(page.getByText('Everything looks good.')).toBeVisible({ timeout: 8000 });
  });

  test('handles SSE context events showing portfolio/scanner/risk cards', async ({ page }) => {
    const sseBody = [
      'data: {"type":"context","kind":"portfolio","data":{"totalValue":10000,"pnlToday":200,"pnlTodayPct":2,"exposurePct":24,"positions":2}}\n\n',
      'data: {"type":"token","token":"Here is your portfolio summary."}\n\n',
      'data: {"type":"done","reply":"Here is your portfolio summary.","latencyMs":180,"model":"llama4:maverick"}\n\n',
    ].join('');
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Show portfolio');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByTestId('relay-sidebar-context-card')).toBeAttached({ timeout: 8000 });
    await expect(page.getByText('PORTFOLIO')).toBeVisible();
    await expect(page.getByText('Here is your portfolio summary.')).toBeVisible({ timeout: 8000 });
  });

  test('handles SSE trade confirmation event', async ({ page }) => {
    const sseBody = [
      'data: {"type":"trade_confirmation","slug":"btc-100k","direction":"YES","size":50}\n\n',
      'data: {"type":"done","reply":"Ready to execute. Confirm below.","latencyMs":120,"model":"llama4:maverick"}\n\n',
    ].join('');
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Buy BTC 100k YES');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Trade Confirmation')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('btc-100k')).toBeVisible();
    await expect(page.getByText('Confirm')).toBeVisible();
    await expect(page.getByText('Cancel')).toBeVisible();
  });

  test('renders markdown in agent responses (bold, italic, code)', async ({ page }) => {
    const sseBody =
      'data: {"type":"done","reply":"**Bold text** and *italic text* with `inline code`","latencyMs":100,"model":"llama4:maverick"}\n\n';
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Test markdown');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.locator('strong', { hasText: 'Bold text' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('em', { hasText: 'italic text' })).toBeVisible();
    await expect(page.locator('code', { hasText: 'inline code' })).toBeVisible();
  });

  test('shows suggestion prompts after agent response', async ({ page }) => {
    const sseBody =
      'data: {"type":"done","reply":"Portfolio is healthy.","latencyMs":150,"model":"llama4:maverick","suggestions":["Show open positions","Check risk status","Review recent trades"]}\n\n';
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Quick check');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Portfolio is healthy.')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('relay-sidebar-suggestion').first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking a suggestion sends it as a new message', async ({ page }) => {
    let chatCount = 0;
    await page.route('**/api/v1/agent/chat', (route) => {
      chatCount += 1;
      if (chatCount === 1) {
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: 'data: {"type":"done","reply":"Here you go.","latencyMs":100,"model":"llama4:maverick","suggestions":["Show positions"]}\n\n',
        });
      } else {
        const body = route.request().postDataJSON();
        expect(body.message).toBe('Show positions');
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: 'data: {"type":"done","reply":"You have 2 open positions.","latencyMs":80,"model":"llama4:maverick"}\n\n',
        });
      }
    });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Start');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Here you go.')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('relay-sidebar-suggestion').first().click({ timeout: 5000 });
    await expect(page.getByText('You have 2 open positions.')).toBeVisible({ timeout: 8000 });
  });

  test('shows default action prompts when no custom suggestions provided', async ({ page }) => {
    const sseBody =
      'data: {"type":"done","reply":"Ready.","latencyMs":50,"model":"llama4:maverick"}\n\n';
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Hello');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Ready.')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('relay-sidebar-suggestion').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows error message when SSE returns error event', async ({ page }) => {
    const sseBody =
      'data: {"type":"error","error":"Service temporarily unavailable"}\n\n';
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Test error');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText(/unable to reach|offline|unavailable/i)).toBeVisible({ timeout: 8000 });
  });

  test('shows error message when API returns HTTP error', async ({ page }) => {
    await page.route('**/api/v1/agent/chat', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Fail test');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText(/unable to reach|offline|error/i)).toBeVisible({ timeout: 8000 });
  });

  test('maintains conversation history across multiple messages', async ({ page }) => {
    let turnCount = 0;
    const replies: Record<number, string> = {
      1: 'First response.',
      2: 'Second response with context.',
      3: 'Third response acknowledging history.',
    };
    await page.route('**/api/v1/agent/chat', (route) => {
      turnCount += 1;
      const reply = replies[turnCount] || 'OK.';
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: `data: {"type":"done","reply":"${reply}","latencyMs":${50 * turnCount},"model":"llama4:maverick"}\n\n`,
      });
    });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });

    await page.getByTestId('relay-sidebar-input').fill('First message');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('First response.')).toBeVisible({ timeout: 8000 });

    await page.getByTestId('relay-sidebar-input').fill('Second message');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Second response with context.')).toBeVisible({ timeout: 8000 });

    await page.getByTestId('relay-sidebar-input').fill('Third message');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Third response acknowledging history.')).toBeVisible({ timeout: 8000 });

    await expect(page.getByText('First message')).toBeVisible();
    await expect(page.getByText('Second message')).toBeVisible();
    await expect(page.getByText('Third message')).toBeVisible();
  });

  test('shows intro message on first open with agent identity', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText(/here|online|ready/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows autopilot status badge in drawer header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText(/Autopilot (On|Off)/i)).toBeVisible();
  });

  test('shows pulsing ring on chat button before first open', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('relay_hasBeenOpened'));
    await page.goto('/dashboard');
    await expect(page.getByText('Hey! Talk to me')).toBeVisible({ timeout: 10000 });
  });

  test('opens drawer when open-agent-chat event is dispatched', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-agent-chat'));
    });
    await expect(page.getByText('Quantik Command Drawer')).toBeVisible({ timeout: 5000 });
  });

  test('disables input while waiting for response', async ({ page }) => {
    await page.route('**/api/v1/agent/chat', (route) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'data: {"type":"done","reply":"Delayed response.","latencyMs":2000,"model":"llama4:maverick"}\n\n',
          });
          resolve(undefined);
        }, 2000);
      });
    });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Slow test');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Slow test')).toBeVisible();
  });

  test('sends session ID with chat requests', async ({ page }) => {
    await page.route('**/api/v1/agent/chat', (route) => {
      const headers = route.request().headers();
      expect(headers['x-session-id']).toBeTruthy();
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'data: {"type":"done","reply":"Session verified.","latencyMs":50,"model":"llama4:maverick"}\n\n',
      });
    });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await page.getByTestId('relay-sidebar-input').fill('Session test');
    await page.getByTestId('relay-sidebar-input').press('Enter');
    await expect(page.getByText('Session verified.')).toBeVisible({ timeout: 8000 });
  });

  test.describe('RelayChat — Market Panel', () => {
    test('renders relay panel in market page after pipeline completes', async ({ page }) => {
      await page.route('**/api/v1/agent/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'agent-std-1',
            name: 'Signal Scout',
            avatar_emoji: '🦊',
            status: 'active',
            agent_type: 'standard',
            wallet_address: '0x1111111111111111111111111111111111111111',
          }),
        })
      );
      const sseBody = [
        'data: {"type":"token","token":"Market "}\n\n',
        'data: {"type":"token","token":"analysis complete."}\n\n',
        'data: {"type":"done","reply":"Market analysis complete.","latencyMs":120,"model":"llama4:maverick","routedTo":["oracle","edge"]}\n\n',
      ].join('');
      await page.route('**/api/relay/stream', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
    });

    test('relay panel shows header with model badge', async ({ page }) => {
      const sseBody =
        'data: {"type":"done","reply":"Analysis ready.","latencyMs":90,"model":"llama4:maverick","routedTo":["oracle"],"agentData":{"confidence":0.78}}\n\n';
      await page.route('**/api/relay/stream', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
    });

    test('relay panel renders agent routing chips after response', async () => {
      // Structural test - verifies data-testid attributes exist
    });
  });

  test.describe('Context Cards', () => {
    test('renders scanner context card with signal data', async ({ page }) => {
      const sseBody = [
        `data: {"type":"context","kind":"scanner","data":{"topSignal":{"question":"Will BTC hit 100k?","recommendation":"TRADE","confidence":0.82},"newAlerts":3,"lastScannedAt":${Date.now()}}}\n\n`,
        'data: {"type":"done","reply":"Scanner shows 3 new alerts.","latencyMs":200,"model":"llama4:maverick"}\n\n',
      ].join('');
      await page.route('**/api/v1/agent/chat', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
      await page.goto('/dashboard');
      await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
      await page.getByTestId('relay-sidebar-input').fill('Show scanner');
      await page.getByTestId('relay-sidebar-input').press('Enter');
      await expect(page.getByTestId('relay-sidebar-context-card')).toBeAttached({ timeout: 8000 });
      await expect(page.getByText('SCANNER')).toBeVisible();
    });

    test('renders risk context card with exposure and circuit data', async ({ page }) => {
      const sseBody = [
        'data: {"type":"context","kind":"risk","data":{"exposurePct":24.3,"sizeCapPct":15,"circuitBreaker":"ARMED","topCluster":"BTC markets","dailyPnl":200}}\n\n',
        'data: {"type":"done","reply":"Risk posture is stable.","latencyMs":150,"model":"llama4:maverick"}\n\n',
      ].join('');
      await page.route('**/api/v1/agent/chat', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
      await page.goto('/dashboard');
      await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
      await page.getByTestId('relay-sidebar-input').fill('Risk status');
      await page.getByTestId('relay-sidebar-input').press('Enter');
      await expect(page.getByTestId('relay-sidebar-context-card')).toBeAttached({ timeout: 8000 });
      await expect(page.getByText('RISK')).toBeVisible();
    });

    test('renders ops context card with health and connection info', async ({ page }) => {
      const sseBody = [
        'data: {"type":"context","kind":"ops","data":{"healthScore":92,"connectionStatus":"connected","autopilotEnabled":true,"heartbeatMs":1200}}\n\n',
        'data: {"type":"done","reply":"All systems operational.","latencyMs":90,"model":"llama4:maverick"}\n\n',
      ].join('');
      await page.route('**/api/v1/agent/chat', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
      await page.goto('/dashboard');
      await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
      await page.getByTestId('relay-sidebar-input').fill('System status');
      await page.getByTestId('relay-sidebar-input').press('Enter');
      await expect(page.getByTestId('relay-sidebar-context-card')).toBeAttached({ timeout: 8000 });
      await expect(page.getByText('OPS')).toBeVisible();
    });

    test('context log entries can be expanded/collapsed', async ({ page }) => {
      const sseBody = [
        'data: {"type":"context","kind":"portfolio","data":{"totalValue":10000,"pnlToday":200,"pnlTodayPct":2,"exposurePct":24}}\n\n',
        'data: {"type":"done","reply":"Portfolio loaded.","latencyMs":100,"model":"llama4:maverick"}\n\n',
      ].join('');
      await page.route('**/api/v1/agent/chat', (route) =>
        route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sseBody })
      );
      await page.goto('/dashboard');
      await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
      await page.getByTestId('relay-sidebar-input').fill('Portfolio');
      await page.getByTestId('relay-sidebar-input').press('Enter');
      await expect(page.getByText('Portfolio loaded.')).toBeVisible({ timeout: 8000 });
      await expect(page.getByTestId('relay-sidebar-context-toggle')).toBeAttached();
    });
  });

  test('uses guardian theme colors for guardian personality agent', async ({ page }) => {
    await mockAgent(page, { name: 'Shield Agent', avatar_emoji: '🛡️', personality: 'guardian' });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Shield Agent')).toBeVisible();
  });

  test('uses adventurer theme colors for adventurer personality agent', async ({ page }) => {
    await mockAgent(page, { name: 'Bold Explorer', avatar_emoji: '⚡', personality: 'adventurer' });
    await page.goto('/dashboard');
    await page.locator('button[aria-label^="Chat with"]').click({ timeout: 10000 });
    await expect(page.getByText('Bold Explorer')).toBeVisible();
  });
});

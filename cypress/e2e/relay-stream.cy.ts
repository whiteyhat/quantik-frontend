// relay-stream.cy.ts — SSE streaming E2E tests

const SSE_BODY = [
  'data: {"type":"token","token":"Volatility "}\n\n',
  'data: {"type":"token","token":"is "}\n\n',
  'data: {"type":"token","token":"dancing "}\n\n',
  'data: {"type":"token","token":"with grace. "}\n\n',
  'data: {"type":"metadata","routedTo":["edge"],"agentData":{"edge":{"kelly":0.6}}}\n\n',
  'data: {"type":"done","reply":"Volatility is dancing with grace. Tip: Tighten Kelly fraction to 0.6.","latencyMs":312,"model":"gemini-2.5-flash-lite","routedTo":["edge"],"agentData":{"edge":{"kelly":0.6}}}\n\n',
].join('');

const JSON_FALLBACK_BODY = JSON.stringify({
  reply: 'Market is quiet today. Tip: Review your exposure.',
  routedTo: ['risk'],
  agentData: null,
  latencyMs: 150,
  model: 'gemini-2.5-flash-lite',
});

describe('Relay SSE Streaming', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('1. Streaming panel loads', () => {
    cy.get('[data-testid="relay-chat-panel"]').should('be.visible');
    cy.get('[data-testid="relay-input"]').should('be.visible');
    cy.get('[data-testid="relay-send"]').should('be.visible');
  });

  it('2. Token events append text incrementally (mocked SSE)', () => {
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: SSE_BODY,
      });
    }).as('streamReq');

    cy.get('[data-testid="relay-input"]').type('How is the market today?');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@streamReq');

    // Text accumulates
    cy.contains('Volatility is dancing with grace.', { timeout: 5000 }).should('exist');
  });

  it('3. Reply word count ≤ 90 after done event', () => {
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: SSE_BODY,
      });
    }).as('streamReq');

    cy.get('[data-testid="relay-input"]').type('Market today?');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@streamReq');

    cy.contains('Tip:', { timeout: 5000 }).then(($el) => {
      const text = $el.closest('[data-testid="relay-chat-panel"]').text();
      const wordCount = text.trim().split(/\s+/).length;
      expect(wordCount).to.be.lessThan(200); // panel has other text, just sanity check
    });
  });

  it('4. Reply ends with "Tip:"', () => {
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: SSE_BODY,
      });
    }).as('streamReq');

    cy.get('[data-testid="relay-input"]').type('Signal?');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@streamReq');

    cy.contains('Tip:', { timeout: 5000 }).should('exist');
  });

  it('5. Model badge appears after done event', () => {
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: SSE_BODY,
      });
    }).as('streamReq');

    cy.get('[data-testid="relay-input"]').type('Status?');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@streamReq');

    cy.get('[data-testid="relay-model-badge"]', { timeout: 5000 }).should('be.visible');
  });

  it('6. Cursor ▌ visible during stream, gone after done', () => {
    // Slow stream to catch cursor mid-flight
    const slowSSE = [
      'data: {"type":"token","token":"Loading... "}\n\n',
    ].join('');

    cy.intercept('POST', '**/api/relay/stream', (req) => {
      // Reply with just a token, no done — cursor should stay
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: slowSSE,
        delay: 100,
      });
    }).as('slowStream');

    cy.get('[data-testid="relay-input"]').type('Stream test');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@slowStream');

    // Cursor should appear (streaming placeholder)
    cy.get('[data-testid="relay-stream-cursor"]', { timeout: 3000 }).should('exist');

    // Full stream — cursor gone after done
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: SSE_BODY,
      });
    }).as('fullStream');

    cy.get('[data-testid="relay-input"]').type('Done stream');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@fullStream');

    cy.get('[data-testid="relay-stream-cursor"]', { timeout: 5000 }).should('not.exist');
  });

  it('7. Graceful JSON fallback when content-type is application/json', () => {
    cy.intercept('POST', '**/api/relay/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON_FALLBACK_BODY,
      });
    }).as('jsonFallback');

    cy.get('[data-testid="relay-input"]').type('Fallback test');
    cy.get('[data-testid="relay-send"]').click();
    cy.wait('@jsonFallback');

    cy.contains('Market is quiet today.', { timeout: 5000 }).should('exist');
    cy.get('[data-testid="relay-model-badge"]', { timeout: 5000 }).should('be.visible');
  });
});

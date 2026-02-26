describe('Trading Flow', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('GET', '**/api/v1/settings/paper-mode', (req) => {
      req.reply({ enabled: req.headers['x-mock-toggled'] === 'true' ? true : false })
    }).as('getPaperMode')
    cy.intercept('POST', '**/api/v1/settings/paper-mode', { body: { success: true } }).as('setPaperMode')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('POST', '**/api/trade/execute', { statusCode: 200, body: {} }).as('executeTrade')
    cy.intercept('POST', '**/api/v1/panic-mode/activate', { statusCode: 200, body: { success: true } }).as('panicMode')
  })

  it('toggles paper mode, visits a market, runs pipeline, and clicks trading buttons', () => {
    cy.visit('/settings')
    cy.wait('@getPaperMode')
    cy.intercept('GET', '**/api/v1/settings/paper-mode', { body: { enabled: true } }).as('getPaperModeEnabled')
    cy.get('button[aria-label="Toggle"]').first().click()
    cy.wait('@setPaperMode')
    cy.contains('Active — all trades are simulated').should('be.visible')

    // 2. Visit Market Detail Page with mocked fetch for streams
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad(win) {
        const originalFetch = win.fetch;
        cy.stub(win, 'fetch').callsFake((url, options) => {
          if (typeof url === 'string' && url.includes('/api/pipeline/run')) {
            const stream = new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('{"type":"agent","agent":"Sigma","status":"success","data":{"decision": "BET_YES", "confidence": 0.85, "size_usd": 100, "entry_price": 0.45}}\n'));
                controller.close();
              }
            });
            return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
          }
          return originalFetch.call(win, url, options);
        });
      }
    })
    cy.wait('@getMarket')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')

    // 3. Run Pipeline
    cy.contains('Run Analysis Pipeline').click()

    // 4. Trade Confirmation
    cy.contains('Simulate Trade').should('be.visible').click()
    cy.contains('YES').should('be.visible')
    cy.contains('Simulate Trade').click()
    cy.wait('@executeTrade')

    // 5. Panic Button
    cy.get('button[title="Emergency Panic Mode"]').click()
    cy.contains('Liquidate').click()
    cy.contains('SLIDE TO ACTIVATE').parent().next().then(($thumb) => {
      cy.wrap($thumb)
        .trigger('pointerdown', { clientX: 0, force: true })
        .trigger('pointermove', { clientX: 300, force: true })
        .trigger('pointerup', { force: true })
    })
    cy.wait('@panicMode')
    cy.contains('EMERGENCY PROTOCOL ACTIVATED').should('be.visible')
  })
})

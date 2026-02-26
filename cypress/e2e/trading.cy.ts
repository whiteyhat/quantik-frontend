describe('Trading Flow', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    if (err.message.includes('setPointerCapture')) {
      return false
    }
  })

  beforeEach(() => {
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('POST', '**/api/v1/settings/paper-mode', { body: { success: true } }).as('setPaperMode')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('POST', '**/api/trade/execute', { statusCode: 200, body: {} }).as('executeTrade')
    cy.intercept('POST', '**/api/v1/panic-mode/activate', { statusCode: 200, body: { success: true } }).as('panicMode')
  })

  it('toggles paper mode, visits a market, runs pipeline, and clicks trading buttons', () => {
    cy.visit('/settings')
    cy.wait('@getSettings')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: true } }).as('getSettingsEnabled')
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
                const sendEvent = (agent, data) => {
                  controller.enqueue(new TextEncoder().encode(`data: {"agent":"${agent}","status":"done","data":${JSON.stringify(data)}}\n\n`));
                };
                sendEvent("aura", {sentiment_score: 0.8, echo_chamber: false});
                sendEvent("flux", {liquidity_grade: "A", spread: 0.1, whale_signals: 0});
                sendEvent("oracle", {prob_estimate: 0.8, market_implied: 0.75, confidence: 90});
                sendEvent("edge", {ev_grade: "A", net_ev: 15, kelly: 5, recommended_size: 10});
                sendEvent("clause", {resolution_risk: "LOW", technicality_risks: []});
                sendEvent("lucifer", {devils_advocate_score: 0.2, bias_flags: [], counter_thesis: "Test"});
                sendEvent("sigma", {decision: "BET_YES", confidence: 85, size_usd: 100, entry_price: 0.45, size_pct: 10, thesis: "Test thesis"});
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

    // Wait for the pipeline to complete
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')

    // 4. Trade Confirmation
    cy.contains('Simulate Trade').scrollIntoView().should('be.visible').click({ force: true })
    cy.contains('Confirm Trade').should('be.visible')
    cy.contains('.glass-card-elevated', 'Confirm Trade').contains('button', 'Simulate Trade').click({ force: true })
    cy.wait('@executeTrade')

    // 5. Panic Button
    cy.get('button[title="Emergency Panic Mode"]').click()
    cy.contains('Liquidate').click()
    cy.contains('SLIDE TO ACTIVATE').parent().parent().click({ force: true })
    
    cy.wait('@panicMode')
    cy.contains('EMERGENCY PROTOCOL ACTIVATED').should('be.visible')
  })
})

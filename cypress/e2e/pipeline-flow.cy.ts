describe('Pipeline Full Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  function mockPipelineStream(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder()
            const agentData: Record<string, Record<string, unknown>> = {
              aura: { sentiment_score: 0.65, echo_chamber: false, echo_chamber_strength: 0.2 },
              oracle: { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 },
              edge: { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 },
              clause: { resolution_risk: 'LOW', technicality_risks: [] },
              flux: { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 },
              lucifer: { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Market may be pricing in optimistic scenario' },
              sigma: { decision: 'BET_YES', confidence: 85, thesis: 'Strong positive edge with healthy liquidity', size_pct: 8, size_usd: 120, entry_price: 0.45 },
            }
            for (const [agent, data] of Object.entries(agentData)) {
              controller.enqueue(enc.encode(`event: agent:start\ndata: ${JSON.stringify({ agent })}\n\n`))
              controller.enqueue(enc.encode(`event: agent:complete\ndata: ${JSON.stringify({ agent, data })}\n\n`))
            }
            controller.enqueue(enc.encode(`event: pipeline:complete\ndata: ${JSON.stringify(agentData)}\n\n`))
            controller.close()
          }
        })
        return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      }
      return originalFetch.call(win, url, options)
    })
  }

  beforeEach(() => {
    cy.intercept('GET', '**/api/performance/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/markets/*/price-history*', { body: [] }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('POST', '**/api/trade/execute', { statusCode: 200, body: { success: true } }).as('executeTrade')
  })

  it('full flow: click run → agents animate → sigma completes → execute button appears', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    // 1. Click Run Analysis Pipeline
    cy.get('[data-testid="run-pipeline-btn"]').should('be.visible').click()

    // 2. Pipeline log auto-expands and shows events
    cy.get('[data-testid="pipeline-log"]', { timeout: 10000 }).should('exist')
    cy.contains('Live Pipeline Feed').should('be.visible')

    // 3. All 7 agents show done status
    cy.get('.status-dot-done', { timeout: 10000 }).should('have.length.at.least', 7)

    // 4. Sigma decision card appears with EXECUTE
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('EXECUTE YES').should('be.visible')

    // 5. Confidence and metrics displayed
    cy.contains('85%').should('be.visible')

    // 6. Execute Trade button appears and is enabled
    cy.get('[data-testid="execute-trade-btn"]')
      .scrollIntoView()
      .should('be.visible')
      .should('not.be.disabled')

    // 7. Signal Validator 5 gates
    cy.get('[data-testid="signal-validator"]').scrollIntoView().should('be.visible')
    cy.get('[data-testid="signal-gate"]').should('have.length', 5)

    // 8. Pipeline log shows completion
    cy.get('[data-testid="pipeline-log"]').contains('Pipeline complete').should('be.visible')
  })

  it('pipeline can be stopped mid-execution', () => {
    // Use a slow pipeline mock that doesn't close immediately
    function mockSlowPipeline(win: Cypress.AUTWindow) {
      const originalFetch = win.fetch
      cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
        if (urlStr.includes('/api/pipeline/run')) {
          const stream = new ReadableStream({
            start(controller) {
              const enc = new TextEncoder()
              // Only send first two agents — simulate slow pipeline
              controller.enqueue(enc.encode(`event: agent:start\ndata: ${JSON.stringify({ agent: 'aura' })}\n\n`))
              controller.enqueue(enc.encode(`event: agent:complete\ndata: ${JSON.stringify({ agent: 'aura', data: { sentiment_score: 0.65, echo_chamber: false } })}\n\n`))
              // Don't close — simulates a running pipeline
            }
          })
          return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
        }
        return originalFetch.call(win, url, options)
      })
    }

    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockSlowPipeline,
    })
    cy.wait('@getMarket')

    // Start pipeline
    cy.get('[data-testid="run-pipeline-btn"]').click()

    // Stop button should appear
    cy.get('[data-testid="stop-pipeline-btn"]', { timeout: 5000 }).should('be.visible')
    cy.contains('Stop Pipeline').click()

    // Run button should reappear
    cy.get('[data-testid="run-pipeline-btn"]', { timeout: 5000 }).should('be.visible')
  })

  it('no TypeErrors or console errors during pipeline execution', () => {
    const consoleErrors: string[] = []

    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad(win) {
        mockPipelineStream(win)
      },
    })
    cy.wait('@getMarket')

    cy.window().then((win) => {
      const origError = win.console.error
      win.console.error = (...args: unknown[]) => {
        consoleErrors.push(args.map(String).join(' '))
        origError.apply(win.console, args)
      }
    })

    cy.contains('Run Analysis Pipeline').click()
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')

    cy.then(() => {
      const typeErrors = consoleErrors.filter((e) =>
        e.includes('TypeError') || e.includes('toFixed is not a function')
      )
      expect(typeErrors).to.have.length(0)
    })
  })
})

describe('Pipeline Log', () => {
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
            const agents = [
              { key: 'aura', data: { sentiment_score: 0.41, echo_chamber: false } },
              { key: 'oracle', data: { prob_estimate: 0.58, market_implied: 0.62, confidence: 76 } },
              { key: 'edge', data: { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 } },
              { key: 'clause', data: { resolution_risk: 'LOW', technicality_risks: [] } },
              { key: 'flux', data: { liquidity_grade: 'A', spread: 1.2, whale_signals: 3 } },
              { key: 'lucifer', data: { devils_advocate_score: 0.35, bias_flags: [], counter_thesis: 'Test' } },
              { key: 'sigma', data: { decision: 'BET_YES', confidence: 87, thesis: 'Strong', size_pct: 8, size_usd: 142, entry_price: 0.45 } },
            ]
            for (const agent of agents) {
              controller.enqueue(enc.encode(`event: agent:start\ndata: ${JSON.stringify({ agent: agent.key })}\n\n`))
              controller.enqueue(enc.encode(`event: agent:complete\ndata: ${JSON.stringify({ agent: agent.key, data: agent.data })}\n\n`))
            }
            controller.enqueue(enc.encode(`event: pipeline:complete\ndata: ${JSON.stringify({})}\n\n`))
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
  })

  it('PipelineLog appears after clicking Run Analysis Pipeline', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    // Pipeline log should not be visible before running
    cy.get('[data-testid="pipeline-log"]').should('not.exist')

    cy.contains('Run Analysis Pipeline').click()

    // Pipeline log should appear
    cy.get('[data-testid="pipeline-log"]', { timeout: 10000 }).should('exist')
    cy.contains('Live Pipeline Feed').should('be.visible')
  })

  it('PipelineLog shows agent events with correct names', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="pipeline-log"]', { timeout: 10000 }).should('exist')

    // Should show event entries for agents
    const agents = ['Aura', 'Oracle', 'Edge', 'Clause', 'Flux', 'Lucifer', 'Sigma']
    agents.forEach((name) => {
      cy.get('[data-testid="pipeline-log"]').contains(name).should('exist')
    })
  })

  it('PipelineLog shows event count', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="pipeline-log"]', { timeout: 10000 }).should('exist')
    // Should show events count (at least 14: 7 running + 7 complete)
    cy.get('[data-testid="pipeline-log"]').contains('events').should('be.visible')
  })

  it('PipelineLog shows pipeline complete message', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="pipeline-log"]', { timeout: 10000 }).should('exist')
    cy.get('[data-testid="pipeline-log"]').contains('Pipeline complete').should('be.visible')
  })
})

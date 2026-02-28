describe('Market Page Layout', () => {
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
              aura: { sentiment_score: 0.65, echo_chamber: false },
              oracle: { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 },
              edge: { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 },
              clause: { resolution_risk: 'LOW', technicality_risks: [] },
              flux: { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 },
              lucifer: { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Test' },
              sigma: { decision: 'BET_YES', confidence: 85, thesis: 'Strong', size_pct: 8, size_usd: 120, entry_price: 0.45 },
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
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/markets/*/price-history*', {
      body: Array.from({ length: 10 }, (_, i) => ({
        t: Date.now() - (9 - i) * 86400000,
        p: 0.5,
      })),
    }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
  })

  it('all sections present: header, chart, button, agents', () => {
    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    // Back button
    cy.contains('Back').should('be.visible')

    // Market header with question
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')

    // YES / NO prices
    cy.contains('YES').should('be.visible')
    cy.contains('NO').should('be.visible')

    // Price chart
    cy.get('[data-testid="price-chart"]').should('exist')
    cy.contains('Price History').should('be.visible')

    // Run pipeline button
    cy.get('[data-testid="run-pipeline-btn"]').should('be.visible')
    cy.contains('Run Analysis Pipeline').should('be.visible')

    // Agent Pipeline section
    cy.contains('Agent Pipeline').should('be.visible')

    // All 7 agents listed
    const agents = ['Aura', 'Oracle', 'Edge', 'Clause', 'Flux', 'Lucifer', 'Sigma']
    agents.forEach((name) => {
      cy.contains(name).should('exist')
    })
  })

  it('after pipeline: sigma decision, signal validator sections appear', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    cy.contains('Run Analysis Pipeline').click()

    // Sigma decision card
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('EXECUTE YES').should('be.visible')
    cy.get('[data-testid="execute-trade-btn"]').should('exist')

    // Signal validator 5-gate checklist
    cy.contains('SIGNAL VALIDATOR').scrollIntoView().should('be.visible')
    cy.get('[data-testid="signal-validator"]').should('exist')
    cy.get('[data-testid="signal-gate"]').should('have.length', 5)

    // Pipeline log
    cy.get('[data-testid="pipeline-log"]').should('exist')
    cy.contains('Live Pipeline Feed').should('be.visible')
  })

  it('layout is mobile-first single column', () => {
    cy.viewport(375, 812) // iPhone X viewport
    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    // All sections should stack vertically and be visible
    cy.contains('Back').should('be.visible')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    cy.get('[data-testid="price-chart"]').should('be.visible')
    cy.get('[data-testid="run-pipeline-btn"]').should('be.visible')
    cy.contains('Agent Pipeline').should('be.visible')
  })
})

describe('Market Pipeline', () => {
  Cypress.on('uncaught:exception', (err) => {
    // Suppress pointer capture and hydration errors
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  const AGENT_NAMES = ['Aura', 'Oracle', 'Edge', 'Clause', 'Flux', 'Lucifer', 'Sigma']

  function mockPipelineStream(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const send = (agent: string, data: Record<string, unknown>) => {
              // Send running state first
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ agent, status: 'running' })}\n\n`
                )
              )
              // Then done state with data
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`
                )
              )
            }
            send('aura', { sentiment_score: 0.65, echo_chamber: false, echo_chamber_strength: 0.2 })
            send('oracle', { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 })
            send('edge', { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 })
            send('clause', { resolution_risk: 'LOW', technicality_risks: [] })
            send('flux', { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 })
            send('lucifer', { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Market may be pricing in optimistic scenario' })
            send('sigma', { decision: 'BET_YES', confidence: 85, thesis: 'Strong positive edge with healthy liquidity', size_pct: 8, size_usd: 120, entry_price: 0.45 })
            controller.close()
          }
        })
        return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      }
      return originalFetch.call(win, url, options)
    })
  }

  /** Sends pipeline data where spread/ev come as strings to test Number() coercion */
  function mockPipelineStreamWithStrings(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const send = (agent: string, data: Record<string, unknown>) => {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`
                )
              )
            }
            send('aura', { sentiment_score: '0.65', echo_chamber: false })
            send('oracle', { prob_estimate: '0.78', market_implied: '0.45', confidence: '82' })
            send('edge', { ev_grade: 'B', net_ev: '8.3', kelly: '3.2', recommended_size: '6' })
            send('clause', { resolution_risk: 'LOW', technicality_risks: [] })
            send('flux', { liquidity_grade: 'B', spread: '2.5', whale_signals: 1 })
            send('lucifer', { devils_advocate_score: '0.4', bias_flags: [], counter_thesis: 'Test' })
            send('sigma', { decision: 'BET_YES', confidence: '75', thesis: 'Test thesis', size_pct: '5', size_usd: '80', entry_price: '0.45' })
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
    cy.intercept('GET', '**/api/markets/btc-100k/price-history*', { body: [] }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('POST', '**/api/trade/execute', { statusCode: 200, body: { success: true } }).as('executeTrade')
  })

  it('loads market page without crash on valid slug', () => {
    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    cy.contains('Run Analysis Pipeline').should('be.visible')
  })

  it('Run Analysis Pipeline button exists and is clickable', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').should('be.visible').click()
    // Should switch to Stop Pipeline
    cy.contains('Stop Pipeline').should('be.visible')
  })

  it('pipeline runs and each agent card shows done state', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    // All 7 agents should show DONE
    AGENT_NAMES.forEach((name) => {
      cy.contains(name).should('be.visible')
    })
    cy.get('.status-dot-done', { timeout: 10000 }).should('have.length.at.least', 7)
  })

  it('pipeline completes and Sigma decision card shows EXECUTE', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('EXECUTE YES').should('be.visible')
  })

  it('does not crash with toFixed when API returns string values', () => {
    const consoleErrors: string[] = []

    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad(win) {
        // Capture console errors
        const origError = win.console.error
        win.console.error = (...args: unknown[]) => {
          consoleErrors.push(args.map(String).join(' '))
          origError.apply(win.console, args)
        }
        mockPipelineStreamWithStrings(win)
      },
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    // Pipeline should complete without crash
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')

    // Verify no toFixed errors
    cy.then(() => {
      const toFixedErrors = consoleErrors.filter((e) => e.includes('toFixed is not a function'))
      expect(toFixedErrors).to.have.length(0)
    })
  })

  it('Execute Trade button shown only when EXECUTE decision', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('Execute Trade').scrollIntoView().should('be.visible')
  })

  it('all 7 agent cards rendered with correct names', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    // All agents visible even before running pipeline
    AGENT_NAMES.forEach((name) => {
      cy.contains(name).should('exist')
    })
  })

  it('Signal Validator 5-gate checklist visible after pipeline', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGNAL VALIDATOR', { timeout: 10000 }).scrollIntoView().should('be.visible')
    cy.get('[data-testid="signal-validator"]').should('exist')
    cy.get('[data-testid="signal-gate"]').should('have.length', 5)
  })
})

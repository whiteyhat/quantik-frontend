describe('Signal Validator L2', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  const MOCK_SIGNALS = [
    { id: '1', slug: 'btc-100k', question: 'Will Bitcoin reach $100k by 2026?', decision: 'BUY_YES', confidence: 0.85, edge: 0.12, timestamp: Date.now() - 60000, status: 'TRADE' },
    { id: '2', slug: 'eth-merge', question: 'Will Ethereum merge happen on time?', decision: 'HOLD', confidence: 0.55, edge: 0.03, timestamp: Date.now() - 120000, status: 'WATCH' },
    { id: '3', slug: 'fed-rate', question: 'Will the Fed cut rates in March?', decision: 'PASS', confidence: 0.72, edge: -0.02, timestamp: Date.now() - 300000, status: 'SKIP' },
  ]

  function mockPipelineStream(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url

      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const send = (agent: string, data: Record<string, unknown>) => {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'running' })}\n\n`))
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`))
            }
            send('aura', { sentiment_score: 0.65, echo_chamber: false })
            send('oracle', { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 })
            send('edge', { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 })
            send('clause', { resolution_risk: 'LOW', technicality_risks: [] })
            send('flux', { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 })
            send('lucifer', { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Market may be overpriced' })
            send('sigma', { decision: 'BET_YES', confidence: 85, thesis: 'Strong edge', size_pct: 8, size_usd: 120, entry_price: 0.45 })
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
    cy.intercept('GET', '**/api/markets/btc-100k/price-history*', { body: [] }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('GET', '**/api/orchestrator/status', {
      body: { lastScanAt: Date.now(), nextScanAt: Date.now() + 600000, marketsScanned: 50, candidatesFound: 5, scanIntervalMs: 600000, status: 'idle' },
    }).as('orchestratorStatus')
    cy.intercept('GET', '**/api/orchestrator/candidates', {
      body: { candidates: [], total: 0, scanCycle: 1 },
    }).as('orchestratorCandidates')
    cy.intercept('GET', '**/api/wallet/positions', { body: [] }).as('positions')
    cy.intercept('GET', '**/api/pipeline/history', { body: [] }).as('pipelineHistory')
  })

  // ── Test 1: RecentSignals panel renders on dashboard ──────────────────────
  it('RecentSignals panel renders on dashboard', () => {
    cy.intercept('GET', '**/api/signals', {
      statusCode: 200,
      body: MOCK_SIGNALS,
    }).as('getSignals')
    cy.intercept('GET', '**/api/pipeline/results', { body: MOCK_SIGNALS }).as('getPipelineResults')

    cy.visit('/dashboard')
    cy.wait(['@getSignals', '@portfolio'], { timeout: 10000 })

    cy.get('[data-testid="recent-signals"]', { timeout: 10000 }).should('exist').and('be.visible')
    cy.get('[data-testid="signal-row"]').should('have.length.at.least', 1)
  })

  // ── Test 2: Mock /api/signals → verify TRADE/WATCH/SKIP badges ────────────
  it('signal rows show correct TRADE, WATCH, and SKIP badges', () => {
    cy.intercept('GET', '**/api/signals', {
      statusCode: 200,
      body: MOCK_SIGNALS,
    }).as('getSignals')
    cy.intercept('GET', '**/api/pipeline/results', { body: MOCK_SIGNALS }).as('getPipelineResults')

    cy.visit('/dashboard')
    cy.wait(['@getSignals', '@portfolio'], { timeout: 10000 })

    cy.get('[data-testid="recent-signals"]', { timeout: 10000 }).should('exist')
    cy.get('[data-testid="signal-row"]').should('have.length', 3)

    // TRADE badge (green)
    cy.get('[data-testid="badge-TRADE"]').should('exist')
      .and('contain.text', 'TRADE')
      .and('have.css', 'color', 'rgb(48, 209, 88)')

    // WATCH badge (yellow/orange)
    cy.get('[data-testid="badge-WATCH"]').should('exist')
      .and('contain.text', 'WATCH')
      .and('have.css', 'color', 'rgb(255, 159, 10)')

    // SKIP badge (red)
    cy.get('[data-testid="badge-SKIP"]').should('exist')
      .and('contain.text', 'SKIP')
      .and('have.css', 'color', 'rgb(255, 69, 58)')
  })

  // ── Test 3: No console TypeErrors on market pipeline page ─────────────────
  it('no console TypeErrors on market pipeline page', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    const errors: string[] = []
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg: unknown) => {
        errors.push(String(msg))
      })
    })
    cy.on('uncaught:exception', (err) => {
      errors.push(err.message)
      return false
    })

    cy.contains('Run Analysis Pipeline').click()

    // Wait for pipeline to complete
    cy.get('[data-testid="signal-validator"]', { timeout: 10000 }).should('be.visible')

    // Verify no TypeErrors
    cy.then(() => {
      const typeErrors = errors.filter((e) => e.includes('TypeError'))
      expect(typeErrors).to.have.length(0)
    })
  })
})

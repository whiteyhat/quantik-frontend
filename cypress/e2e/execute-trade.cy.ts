describe('Execute Trade', () => {
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
            const send = (agent: string, data: Record<string, unknown>) => {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'running' })}\n\n`))
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`))
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

  beforeEach(() => {
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/markets/btc-100k/price-history*', { body: [] }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: true } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('POST', '**/api/execution/order', {
      statusCode: 200,
      body: { orderId: 'order-abc-123', status: 'FILLED' },
    }).as('placeOrder')
  })

  it('Execute Trade button visible after pipeline completes', () => {
    const errors: string[] = []
    cy.on('uncaught:exception', (err) => { errors.push(err.message); return false })

    cy.visit('/market/bitcoin-100k-2026', { onBeforeLoad: mockPipelineStream })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="execute-trade-btn"]').scrollIntoView().should('be.visible')

    cy.then(() => {
      const typeErrors = errors.filter((e) => e.includes('TypeError'))
      expect(typeErrors).to.have.length(0)
    })
  })

  it('clicking Execute Trade opens TradeConfirmationModal', () => {
    const errors: string[] = []
    cy.on('uncaught:exception', (err) => { errors.push(err.message); return false })

    cy.visit('/market/bitcoin-100k-2026', { onBeforeLoad: mockPipelineStream })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="execute-trade-btn"]', { timeout: 10000 }).scrollIntoView().click()

    cy.get('[data-testid="trade-confirmation-modal"]').should('be.visible')
    cy.contains('Confirm Trade').should('be.visible')
    cy.get('[data-testid="modal-direction"]').should('contain', 'YES')
    cy.get('[data-testid="modal-size"]').should('contain', '$120.00')
    cy.get('[data-testid="modal-confidence"]').should('contain', '85%')
    cy.get('[data-testid="modal-edge"]').should('contain', 'A')
    cy.get('[data-testid="modal-slug"]').should('contain', 'bitcoin-100k-2026')

    cy.then(() => {
      const typeErrors = errors.filter((e) => e.includes('TypeError'))
      expect(typeErrors).to.have.length(0)
    })
  })

  it('confirming trade POSTs to /api/execution/order and shows toast', () => {
    const errors: string[] = []
    cy.on('uncaught:exception', (err) => { errors.push(err.message); return false })

    cy.visit('/market/bitcoin-100k-2026', { onBeforeLoad: mockPipelineStream })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="execute-trade-btn"]', { timeout: 10000 }).scrollIntoView().click()
    cy.get('[data-testid="trade-confirmation-modal"]').should('be.visible')

    cy.get('[data-testid="modal-confirm-btn"]').click()

    cy.wait('@placeOrder').its('request.body').should('deep.include', {
      slug: 'bitcoin-100k-2026',
      direction: 'YES',
      sizeUsdc: 120,
    })

    // Modal should close
    cy.get('[data-testid="trade-confirmation-modal"]').should('not.exist')

    // Toast should appear
    cy.get('[data-testid="trade-toast"]', { timeout: 5000 }).should('contain', 'Order placed (Paper Mode)')

    cy.then(() => {
      const typeErrors = errors.filter((e) => e.includes('TypeError'))
      expect(typeErrors).to.have.length(0)
    })
  })

  it('cancel button closes modal without placing order', () => {
    cy.visit('/market/bitcoin-100k-2026', { onBeforeLoad: mockPipelineStream })
    cy.wait('@getMarket')
    cy.contains('Run Analysis Pipeline').click()

    cy.get('[data-testid="execute-trade-btn"]', { timeout: 10000 }).scrollIntoView().click()
    cy.get('[data-testid="trade-confirmation-modal"]').should('be.visible')

    cy.get('[data-testid="modal-cancel-btn"]').click()

    cy.get('[data-testid="trade-confirmation-modal"]').should('not.exist')
    // No order placed
    cy.get('@placeOrder.all').should('have.length', 0)
  })
})

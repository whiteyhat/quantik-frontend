describe('Market Chart', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  beforeEach(() => {
    cy.intercept('GET', '**/api/performance/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
  })

  it('chart renders with synthetic fallback data and shows Estimated badge', () => {
    // Intercept price-history to return synthetic { t, p } format
    cy.intercept('GET', '**/price-history*', {
      body: Array.from({ length: 30 }, (_, i) => ({
        t: Date.now() - (29 - i) * 86400000,
        p: 0.5 + (Math.random() - 0.5) * 0.1,
      })),
    }).as('priceHistory')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')
    cy.wait('@priceHistory')

    // Chart should render (not stuck on loading)
    cy.get('[data-testid="price-chart"]', { timeout: 10000 }).should('exist')
    cy.contains('Price History').should('be.visible')
    cy.contains('Estimated data').should('be.visible')
    // SVG chart area should be rendered
    cy.get('[data-testid="price-chart"] .recharts-area').should('exist')
  })

  it('chart renders with standard { timestamp, yes } format without fallback badge', () => {
    cy.intercept('GET', '**/price-history*', {
      body: Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (29 - i) * 86400000,
        yes: 0.5 + (Math.random() - 0.5) * 0.1,
        no: 0.5 - (Math.random() - 0.5) * 0.1,
      })),
    }).as('priceHistory')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')
    cy.wait('@priceHistory')

    cy.get('[data-testid="price-chart"]', { timeout: 10000 }).should('exist')
    cy.contains('Estimated data').should('not.exist')
    cy.get('[data-testid="price-chart"] .recharts-area').should('exist')
  })

  it('chart shows "No price data" when API returns empty array', () => {
    cy.intercept('GET', '**/price-history*', { body: [] }).as('priceHistory')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')
    cy.wait('@priceHistory')

    cy.get('[data-testid="price-chart"]', { timeout: 10000 }).should('exist')
    cy.contains('No price data available').should('be.visible')
  })

  it('interval selector switches between 1H/1D/1W/All', () => {
    cy.intercept('GET', '**/price-history*', {
      body: Array.from({ length: 10 }, (_, i) => ({
        t: Date.now() - (9 - i) * 86400000,
        p: 0.5,
      })),
    }).as('priceHistory')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('.segmented-control').should('exist')
    cy.get('.segmented-control button').should('have.length', 4)
    cy.get('.segmented-control button').contains('1H').click()
    cy.wait('@priceHistory')
    cy.get('.segmented-control button').contains('1W').click()
    cy.wait('@priceHistory')
  })
})

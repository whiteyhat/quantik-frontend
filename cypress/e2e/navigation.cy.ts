describe('Navigation', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/performance/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets*', { fixture: 'markets.json' }).as('markets')
    cy.intercept('GET', '**/api/v1/trade-history*', { body: [] }).as('tradeHistory')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
  })

  it('navigates through all main routes without crashing', () => {
    cy.visit('/dashboard')
    cy.get('body').should('be.visible')
    
    const routes = [
      { name: 'Markets', url: '/markets' },
      { name: 'Trade History', url: '/trade-history' },
      { name: 'Market Analysis', url: '/market-analysis' },
      { name: 'Settings', url: '/settings' },
    ]

    for (const route of routes) {
      cy.get('a').contains(route.name).click()
      cy.url().should('include', route.url)
      cy.get('body').should('be.visible')
    }
    
    // go back to dashboard
    cy.get('a').contains('Dashboard').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/dashboard')
  })
})

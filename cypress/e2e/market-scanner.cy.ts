describe('Market Scanner', () => {
  const mockMarkets = {
    markets: [
      {
        slug: "bitcoin-100k-2026",
        tokenId: "btc-100k",
        question: "Will Bitcoin reach $100k by 2026?",
        yesPrice: 0.45,
        noPrice: 0.55,
        volume: 1200000,
        liquidityGrade: "A",
        resolutionDate: "2026-01-01T00:00:00Z",
        categories: ["Crypto"]
      }
    ],
    total: 1,
    hasMore: false
  };

  beforeEach(() => {
    // Intercept both trending and regular market endpoints
    cy.intercept('GET', '**/api/markets/trending*', { body: mockMarkets }).as('getTrendingMarkets')
    cy.intercept('GET', '**/api/markets*', { body: mockMarkets }).as('getMarkets')
    cy.intercept('GET', '**/api/performance/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.visit('/markets')
  })

  it('interacts with category filters and search bar, and verifies the grid updates', () => {
    // Check initial state
    cy.contains('Markets', { timeout: 10000 }).should('be.visible')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    
    // Type in search bar to fetch a different mocked set
    cy.intercept('GET', '**/api/markets?search=eth*', { body: { markets: [], total: 0, hasMore: false } }).as('searchEth')
    cy.get('input[placeholder="Search markets…"]').type('eth')
    cy.wait('@searchEth')
    
    // Should be empty now
    cy.contains('Will Bitcoin reach $100k by 2026?').should('not.exist')
    
    // Clear search
    cy.get('input[placeholder="Search markets…"]').clear()
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    
    // Click Category Filter
    cy.contains('Crypto').click()
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    
    // Click a category that won't match "bitcoin" keyword
    cy.contains('Sports').click()
    // The market should vanish because 'bitcoin' is not in Sports keywords
    cy.contains('Will Bitcoin reach $100k by 2026?').should('not.exist')
  })
})

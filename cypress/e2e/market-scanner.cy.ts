describe('Market Scanner', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/markets*', { fixture: 'markets.json' }).as('getMarkets')
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.visit('/markets')
  })

  it('interacts with category filters and search bar, and verifies the grid updates', () => {
    // Check initial state
    cy.wait('@getMarkets')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    
    // Type in search bar to fetch a different mocked set
    cy.intercept('GET', '**/api/markets?search=eth', { body: [] }).as('searchEth')
    cy.get('input[placeholder="Search markets…"]').type('eth')
    cy.wait('@searchEth')
    
    // Should be empty now
    cy.contains('Will Bitcoin reach $100k by 2026?').should('not.exist')
    
    // Clear search
    cy.get('input[placeholder="Search markets…"]').clear()
    cy.wait('@getMarkets')
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

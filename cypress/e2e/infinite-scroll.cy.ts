describe('Infinite Scroll in MarketScanner', () => {
  beforeEach(() => {
    // Generate 40 items total
    const page1 = Array.from({ length: 20 }, (_, i) => ({
      slug: `market-${i}`,
      tokenId: `token-${i}`,
      question: `Market Question ${i}`,
      yesPrice: 0.5,
      noPrice: 0.5,
      volume: 1000,
      liquidity: 500,
      liquidityGrade: "A",
    }));

    const page2 = Array.from({ length: 20 }, (_, i) => ({
      slug: `market-${i + 20}`,
      tokenId: `token-${i + 20}`,
      question: `Market Question ${i + 20}`,
      yesPrice: 0.5,
      noPrice: 0.5,
      volume: 1000,
      liquidity: 500,
      liquidityGrade: "A",
    }));

    // Setup intercept for first load
    cy.intercept('GET', '**/api/markets?limit=20&offset=0', {
      body: {
        markets: page1,
        total: 40,
        hasMore: true
      }
    }).as('getFirstPage');

    // Setup intercept for second load
    cy.intercept('GET', '**/api/markets?limit=20&offset=20', {
      body: {
        markets: page2,
        total: 40,
        hasMore: false
      }
    }).as('getSecondPage');

    cy.intercept('GET', '**/api/stream/prices*', { body: {} }).as('streamPrices');
    cy.intercept('GET', '**/api/portfolio/summary*', { body: {} }).as('summary');
  });

  it('loads more markets when scrolling to the bottom', () => {
    cy.visit('/');

    cy.wait('@getFirstPage');

    // Check that first 20 items are loaded
    cy.get('a[href^="/market/"]').should('have.length', 20);

    // Scroll to the bottom of the grid
    cy.scrollTo('bottom');

    cy.wait('@getSecondPage');

    // Grid should now contain 40 items
    cy.get('a[href^="/market/"]').should('have.length', 40);
  });
});
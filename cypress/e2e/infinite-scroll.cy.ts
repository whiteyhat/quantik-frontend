describe('Infinite Scroll in MarketScanner', () => {
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

  beforeEach(() => {
    // Stub trending to return empty so scanner falls back to "All"
    cy.intercept('GET', '**/api/markets/trending*', {
      body: { markets: [], total: 0, hasMore: false }
    }).as('getTrending');

    cy.intercept('GET', '**/api/markets?limit=20&offset=0', {
      body: { markets: page1, total: 40, hasMore: true }
    }).as('getFirstPage');

    cy.intercept('GET', '**/api/markets?limit=20&offset=20', {
      body: { markets: page2, total: 40, hasMore: false }
    }).as('getSecondPage');

    cy.intercept('GET', '**/api/stream/prices*', { body: {} }).as('streamPrices');
    cy.intercept('GET', '**/api/portfolio/summary*', { body: {} }).as('summary');
  });

  it('loads initial 20 markets on dashboard', () => {
    cy.visit('/');
    cy.wait('@getFirstPage');
    cy.get('[data-testid="load-more-sentinel"]').should('exist');
    cy.get('a[href^="/market/"]').should('have.length.gte', 20);
  });

  it('triggers load-more when sentinel scrolled into view', () => {
    // Mock IntersectionObserver for reliable headless testing
    cy.visit('/', {
      onBeforeLoad(win: any) {
        const observers: any[] = [];
        win.__ioObservers = observers;

        win.IntersectionObserver = class {
          callback: any;
          elements: any[];
          constructor(callback: any) {
            this.callback = callback;
            this.elements = [];
            observers.push(this);
          }
          observe(el: any) { this.elements.push(el); }
          unobserve() {}
          disconnect() {}
        };
      }
    });
    cy.wait('@getFirstPage');
    cy.get('[data-testid="load-more-sentinel"]').scrollIntoView();

    // Manually trigger intersection observers (headless Electron doesn't fire reliably)
    cy.window().then((win: any) => {
      (win.__ioObservers || []).forEach((observer: any) => {
        observer.elements.forEach((el: any) => {
          observer.callback([{ isIntersecting: true, target: el, intersectionRatio: 1 }], observer);
        });
      });
    });

    cy.wait('@getSecondPage', { timeout: 10000 });
    cy.get('a[href^="/market/"]').should('have.length.gte', 40);
  });

  it('shows loading state while fetching more', () => {
    cy.intercept('GET', '**/api/markets?limit=20&offset=0', (req) => {
      req.reply({
        delay: 200,
        body: { markets: page1, total: 40, hasMore: true }
      });
    }).as('slowFirstPage');
    cy.visit('/');
    cy.get('[data-testid="scanner-loading"]').should('exist');
    cy.wait('@slowFirstPage');
    cy.get('[data-testid="scanner-loading"]').should('not.exist');
  });
});

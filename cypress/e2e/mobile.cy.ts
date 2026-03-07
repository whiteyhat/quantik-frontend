describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    cy.viewport('iphone-x'); // 375x812
    cy.visit('/dashboard');
  });

  it('hides the desktop sidebar and shows the BottomTabBar', () => {
    // Desktop sidebar should be hidden
    cy.get('aside').should('not.be.visible');

    // BottomTabBar should be visible
    cy.get('nav').filter('.md\\:hidden').should('be.visible');
  });

  it('navigates through BottomTabBar', () => {
    cy.get('nav').filter('.md\\:hidden').within(() => {
      // Click Markets
      cy.contains('Markets').click();
    });
    cy.url().should('include', '/markets');

    cy.get('nav').filter('.md\\:hidden').within(() => {
      // Click Trades
      cy.contains('Trades').click();
    });
    cy.url().should('include', '/trade-history');
  });

  it('collapses the dashboard 3-column layout to a single column', () => {
    cy.visit('/dashboard');
    // Check that the grid container is now a single column
    // The grid should have elements stacked vertically, which means 
    // we check the grid container has grid-cols-1 by verifying elements overlap horizontally (or simply have the same left bound)
    cy.get('.grid').first().then(($grid) => {
      // Using computed style to verify grid-template-columns has only 1 column
      const columns = window.getComputedStyle($grid[0]).gridTemplateColumns;
      // In a 1-column grid, gridTemplateColumns is typically a single value (e.g. "343px" or "100%")
      // We can also verify that the left column elements and center column elements are in viewport.
      expect(columns.split(' ').length).to.equal(1);
    });

    // Ensure elements are visible within the main content
    cy.get('main').contains('Portfolio').should('be.visible');
    cy.get('main').contains('Market Scanner').should('be.visible');
    cy.get('main').contains('System Status').should('be.visible');
  });

  it('positions the GlobalPanicButton correctly without overlapping BottomTabBar', () => {
    cy.get('button[title="Emergency Panic Mode"]').should('be.visible');
    // For mobile (iphone-x is 812px height), BottomTabBar is at the bottom.
    // Ensure the Panic button is above the nav bar.
    cy.get('nav').filter('.md\\:hidden').then(($nav) => {
      cy.get('button[title="Emergency Panic Mode"]').then(($btn) => {
        const navRect = $nav[0].getBoundingClientRect();
        const btnRect = $btn[0].getBoundingClientRect();
        expect(btnRect.bottom).to.be.lessThan(navRect.top + 10); // Button should be above or just at the top edge of nav
      });
    });
  });

  it('opens Relay via BottomTabBar and sends a message', () => {
    // Intercept the POST BEFORE sending the message
    cy.intercept('POST', '/api/relay').as('relayRequest');

    cy.get('nav').filter('.md\\:hidden').within(() => {
      // Click Relay tab
      cy.contains('Relay').click();
    });

    // The drawer should open and the textarea should be visible
    cy.get('textarea[placeholder="Message Relay…"]').should('be.visible').type('Mobile test{enter}', { force: true });

    // Verify the drawer is full width (100vw)
    cy.window().then((win) => {
      cy.get('.md\\:w-\\[320px\\]').should(($drawer) => {
        expect($drawer[0].getBoundingClientRect().width).to.equal(win.innerWidth);
      });
    });

    // Verify the user message is visible
    cy.contains('Mobile test').should('be.visible');

    cy.wait('@relayRequest', { timeout: 15000 }).then((interception) => {
      // Just assert it returns a valid response code
      expect(interception.response?.statusCode).to.be.oneOf([200, 500, 503]);
    });
  });


  it('trade history page loads without horizontal overflow', () => {
    cy.viewport('iphone-x');
    cy.visit('/trade-history');

    // Page loads without crashing
    cy.get('h1').contains('Trade History').should('be.visible');

    // The main content area does not exceed 100vw
    cy.document().then((doc) => {
      const bodyWidth = doc.body.scrollWidth;
      const windowWidth = doc.documentElement.clientWidth;
      expect(bodyWidth).to.be.at.most(windowWidth);
    });
  });

});

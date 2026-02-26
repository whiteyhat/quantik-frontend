describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    cy.viewport('iphone-x'); // 375x812
    cy.visit('/');
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
      // Click Portfolio
      cy.contains('Portfolio').click();
    });
    cy.url().should('include', '/portfolio');
  });

  it('collapses the dashboard 3-column layout to a single column', () => {
    cy.visit('/');
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
});
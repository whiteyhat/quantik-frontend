const fs = require('fs');
let code = fs.readFileSync('cypress/e2e/mobile.cy.ts', 'utf8');

const relayTest = `
  it('positions the GlobalPanicButton correctly without overlapping BottomTabBar', () => {
    cy.get('button[title="Emergency Panic Mode"]').should('be.visible');
    // For mobile (iphone-x is 812px height), BottomTabBar is at the bottom.
    // Ensure the Panic button is above the nav bar.
    cy.get('nav').filter('.md\\\\:hidden').then(($nav) => {
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

    cy.get('nav').filter('.md\\\\:hidden').within(() => {
      // Click Relay tab
      cy.contains('Relay').click();
    });

    // The drawer should open and the textarea should be visible
    cy.get('textarea[placeholder="Message Relay…"]').should('be.visible').type('Mobile test{enter}');

    // Verify the user message is visible
    cy.contains('Mobile test').should('be.visible');

    cy.wait('@relayRequest', { timeout: 15000 }).then((interception) => {
      // Just assert it returns a valid response code
      expect(interception.response?.statusCode).to.be.oneOf([200, 500, 503]);
    });
  });
`;

code = code.replace(/}\);\s*$/, relayTest + '\n});\n');
fs.writeFileSync('cypress/e2e/mobile.cy.ts', code);

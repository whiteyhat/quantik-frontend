describe('Dashboard', () => {
  it('loads the dashboard, opens Relay, and sends a message', () => {
    // Cypress fails automatically on uncaught exceptions
    
    cy.visit('/')
    
    cy.get('body').invoke('html').then((html) => cy.writeFile('body.html', html))
    
    // The Relay button might be pulsing, but we can find it by aria-label
    cy.get('button[aria-label="Open Relay chat"]').should('be.visible').click()
    
    // Intercept the POST BEFORE sending the message
    cy.intercept('POST', '/api/relay').as('relayRequest')
    
    // The sidebar should open and the textarea should be visible
    cy.get('textarea[placeholder="Message Relay…"]').should('be.visible').type('Hello{enter}')
    
    // Verify the user message is visible
    cy.contains('Hello').should('be.visible')
    
    cy.wait('@relayRequest', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 500, 503]);
      
      // If the API returns 200, we expect a reply message
      if (interception.response?.statusCode === 200) {
        const replyText = interception.response?.body?.reply || interception.response?.body?.message;
        if (replyText) {
          cy.contains(replyText, { timeout: 15000 }).should('be.visible');
        }
      } else {
        // Fallback message should be displayed
        cy.contains('The intelligence network is currently unreachable. Please try again.', { timeout: 15000 }).should('be.visible');
      }
    });
  })
})

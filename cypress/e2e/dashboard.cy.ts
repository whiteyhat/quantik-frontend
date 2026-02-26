describe('Dashboard', () => {
  it('loads the dashboard, opens Relay, and sends a message', () => {
    // Cypress fails automatically on uncaught exceptions
    
    cy.visit('/')
    
    cy.get('body').invoke('html').then((html) => cy.writeFile('body.html', html))
    
    // The Relay button might be pulsing, but we can find it by aria-label
    cy.get('button[aria-label="Open Relay chat"]').should('be.visible').click()
    
    // Intercept the POST BEFORE sending the message
    cy.intercept('POST', '/api/relay', {
      statusCode: 200,
      body: { reply: '**Bold** and *italic*' }
    }).as('relayRequest')
    
    // The sidebar should open and the textarea should be visible
    cy.get('textarea[placeholder="Message Relay…"]').should('be.visible').type('Hello{enter}', { force: true })
    
    // Verify the user message is visible
    cy.contains('Hello').should('be.visible')
    
    cy.wait('@relayRequest', { timeout: 15000 }).then(() => {
      // Assert markdown rendering
      cy.get('strong').contains('Bold').should('be.visible');
      cy.get('em').contains('italic').should('be.visible');
    });
  })
})

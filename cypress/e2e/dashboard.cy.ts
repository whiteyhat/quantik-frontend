describe('Dashboard', () => {
  it('loads the dashboard, opens Relay, and sends a message', () => {
    // Intercept the POST BEFORE visiting the page
    cy.intercept('POST', '**/api/relay', {
      statusCode: 200,
      body: { reply: '**Bold** and *italic*' }
    }).as('relayRequest')

    cy.visit('/dashboard')

    // Wait for the page to render some dashboard content
    cy.get('main', { timeout: 10000 }).should('be.visible')

    // The Relay button might be pulsing, but we can find it by aria-label
    cy.get('button[aria-label="Open Relay chat"]', { timeout: 10000 }).should('be.visible').click()

    // The sidebar opens with a CSS transition — wait for the textarea to appear
    cy.get('textarea[placeholder="Message Relay\u2026"]', { timeout: 8000 }).should('be.visible').type('Hello{enter}', { force: true })

    // Verify the user message is visible
    cy.contains('Hello').should('be.visible')

    cy.wait('@relayRequest', { timeout: 15000 }).then(() => {
      // Assert markdown rendering
      cy.get('strong').contains('Bold').should('be.visible');
      cy.get('em').contains('italic').should('be.visible');
    });
  })
})

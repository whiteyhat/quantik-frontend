describe('Settings / Risk Config', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/risk-config*', { fixture: 'risk-config.json' }).as('getRiskConfig')
    cy.intercept('PUT', '**/api/v1/risk-config*').as('saveRiskConfig')
    cy.intercept('GET', '**/api/portfolio/summary*', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.visit('/settings')
  })

  it('loads risk config, modifies sliders, and saves', () => {
    cy.wait('@getRiskConfig')
    cy.contains('Risk Configuration').should('be.visible')
    cy.contains('Risk Configuration').click()

    cy.contains('Agent VaR Threshold').should('be.visible')
    
    // Modify the first slider
    cy.get('input[type="range"]').first().then($el => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call($el[0], 0.10);
      }
      $el[0].dispatchEvent(new Event('input', { bubbles: true }));
      $el[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    cy.contains('UNSAVED').should('be.visible')
    
    // Intercept with fake response
    cy.intercept('PUT', '**/api/v1/risk-config*', { statusCode: 200, body: {} }).as('saveRiskConfigMock')
    cy.contains('💾 SAVE').click({ force: true })
    cy.wait('@saveRiskConfigMock')
    
    cy.contains('UNSAVED').should('not.exist')
  })
})

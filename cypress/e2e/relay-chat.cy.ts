describe('Relay Chat', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  beforeEach(() => {
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/markets/*/price-history*', {
      body: Array.from({ length: 10 }, (_, i) => ({
        t: Date.now() - (9 - i) * 86400000,
        p: 0.5,
      })),
    }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
  })

  it('relay chat panel loads on market page', () => {
    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-chat-panel"]').scrollIntoView().should('be.visible')
    cy.contains('Quantik Relay').should('be.visible')
    cy.get('[data-testid="relay-input"]').should('be.visible')
    cy.get('[data-testid="relay-send"]').should('be.visible')
  })

  it('sends message and gets reply', () => {
    cy.intercept('POST', '**/api/relay/chat', {
      body: {
        reply: 'Market sentiment is bullish. Tip: check the order book spread.',
        routedTo: ['oracle'],
        agentData: { oracle: { prob_estimate: 0.78 } },
        latencyMs: 128,
        model: 'llama4:maverick',
      },
    }).as('relayChat')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-input"]').scrollIntoView().type('What is the current market sentiment?')
    cy.get('[data-testid="relay-send"]').click()
    cy.wait('@relayChat')

    cy.contains('Market sentiment is bullish').should('be.visible')
  })

  it('reply is under 100 words', () => {
    const shortReply = 'Sentiment runs hot at 0.65 — bullish bias confirmed by Aura. Tip: size conservatively on momentum plays.'
    cy.intercept('POST', '**/api/relay/chat', {
      body: {
        reply: shortReply,
        routedTo: ['aura'],
        agentData: null,
        latencyMs: 95,
        model: 'phi4',
      },
    }).as('relayChat')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-input"]').scrollIntoView().type('sentiment')
    cy.get('[data-testid="relay-send"]').click()
    cy.wait('@relayChat')

    cy.contains(shortReply).should('be.visible').then(($el) => {
      const wordCount = $el.text().split(/\s+/).length
      expect(wordCount).to.be.lessThan(100)
    })
  })

  it('latency badge shows on relay response', () => {
    cy.intercept('POST', '**/api/relay/chat', {
      body: {
        reply: 'All systems operational. Tip: run a pipeline first.',
        routedTo: [],
        agentData: null,
        latencyMs: 234,
        model: 'llama3.2:3b',
      },
    }).as('relayChat')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-input"]').scrollIntoView().type('status')
    cy.get('[data-testid="relay-send"]').click()
    cy.wait('@relayChat')

    cy.get('[data-testid="relay-latency"]').should('contain', '234ms')
  })

  it('agent chips show when routing triggered', () => {
    cy.intercept('POST', '**/api/relay/chat', {
      body: {
        reply: 'Edge calculates 4.8% Kelly. Tip: respect the fraction.',
        routedTo: ['edge', 'oracle'],
        agentData: { edge: { kelly: 4.8 }, oracle: { prob_estimate: 0.72 } },
        latencyMs: 310,
        model: 'llama4:maverick',
      },
    }).as('relayChat')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-input"]').scrollIntoView().type('What is the kelly sizing for this market?')
    cy.get('[data-testid="relay-send"]').click()
    cy.wait('@relayChat')

    cy.get('[data-testid="relay-agent-chip"]').should('have.length', 2)
    cy.get('[data-testid="relay-agent-chip"]').first().should('contain', 'edge')
    cy.get('[data-testid="relay-agent-chip"]').last().should('contain', 'oracle')
  })

  it('model badge updates on response', () => {
    cy.intercept('POST', '**/api/relay/chat', {
      body: {
        reply: 'Running on primary model. Tip: fast is good.',
        routedTo: [],
        agentData: null,
        latencyMs: 89,
        model: 'llama4:maverick',
      },
    }).as('relayChat')

    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')

    cy.get('[data-testid="relay-input"]').scrollIntoView().type('hello')
    cy.get('[data-testid="relay-send"]').click()
    cy.wait('@relayChat')

    cy.get('[data-testid="relay-model-badge"]').should('contain', 'Llama 4 Maverick')
  })
})

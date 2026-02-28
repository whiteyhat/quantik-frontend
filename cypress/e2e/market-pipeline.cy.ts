describe('Market Pipeline', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('setPointerCapture') || err.message.includes('Minified React error')) {
      return false
    }
  })

  const AGENT_NAMES = ['Aura', 'Oracle', 'Edge', 'Clause', 'Flux', 'Lucifer', 'Sigma']

  function mockPipelineStream(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const send = (agent: string, data: Record<string, unknown>) => {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'running' })}\n\n`))
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`))
            }
            send('aura', { sentiment_score: 0.65, echo_chamber: false, echo_chamber_strength: 0.2 })
            send('oracle', { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 })
            send('edge', { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 })
            send('clause', { resolution_risk: 'LOW', technicality_risks: [] })
            send('flux', { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 })
            send('lucifer', { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Market may be pricing in optimistic scenario' })
            send('sigma', { decision: 'BET_YES', confidence: 85, thesis: 'Strong positive edge with healthy liquidity', size_pct: 8, size_usd: 120, entry_price: 0.45 })
            controller.close()
          }
        })
        return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      }
      return originalFetch.call(win, url, options)
    })
  }

  function mockPipelineStreamWithStrings(win: Cypress.AUTWindow) {
    const originalFetch = win.fetch
    cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
      if (urlStr.includes('/api/pipeline/run')) {
        const stream = new ReadableStream({
          start(controller) {
            const send = (agent: string, data: Record<string, unknown>) => {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ agent, status: 'done', data })}\n\n`))
            }
            send('aura', { sentiment_score: '0.65', echo_chamber: false })
            send('oracle', { prob_estimate: '0.78', market_implied: '0.45', confidence: '82' })
            send('edge', { ev_grade: 'B', net_ev: '8.3', kelly: '3.2', recommended_size: '6' })
            send('clause', { resolution_risk: 'LOW', technicality_risks: [] })
            send('flux', { liquidity_grade: 'B', spread: '2.5', whale_signals: 1 })
            send('lucifer', { devils_advocate_score: '0.4', bias_flags: [], counter_thesis: 'Test' })
            send('sigma', { decision: 'BET_YES', confidence: '75', thesis: 'Test thesis', size_pct: '5', size_usd: '80', entry_price: '0.45' })
            controller.close()
          }
        })
        return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      }
      return originalFetch.call(win, url, options)
    })
  }

  beforeEach(() => {
    cy.intercept('GET', '**/api/portfolio/summary', { fixture: 'portfolio.json' }).as('portfolio')
    cy.intercept('GET', '**/api/markets/bitcoin-100k-2026', { fixture: 'market-single.json' }).as('getMarket')
    cy.intercept('GET', '**/api/markets/btc-100k/price-history*', { body: [] }).as('priceHistory')
    cy.intercept('GET', '**/api/v1/settings', { body: { paperMode: false } }).as('getSettings')
    cy.intercept('GET', '**/api/v1/risk-config', { fixture: 'risk-config.json' }).as('riskConfig')
    cy.intercept('POST', '**/api/trade/execute', { statusCode: 200, body: { success: true } }).as('executeTrade')
  })

  it('loads market page without crash on valid slug', () => {
    cy.visit('/market/bitcoin-100k-2026')
    cy.wait('@getMarket')
    cy.contains('Will Bitcoin reach $100k by 2026?').should('be.visible')
    cy.contains('Run Analysis Pipeline').should('be.visible')
  })

  it('pipeline run does not crash with toFixed TypeError', () => {
    const errors: string[] = [];
    cy.on('uncaught:exception', (err) => {
      errors.push(err.message);
      return false; // don't fail test here, we assert below
    });
    cy.visit('/markets');
    // Get first market slug
    cy.get('a[href^="/market/"]').first().click();
    cy.url().should('include', '/market/');
    cy.contains('Run Analysis Pipeline').click();
    cy.wait(3000);
    cy.wrap(errors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(errors).should('not.include.match', /TypeError/);
  });

  it('Run Analysis Pipeline button exists and is clickable', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')
    
    const consoleErrors: string[] = [];
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(String(msg));
      });
    });

    cy.contains('Run Analysis Pipeline').should('be.visible').click()
    
    // We don't check for 'Stop Pipeline' because the mock stream is so fast 
    // it immediately transitions to done.
    
    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })

  it('pipeline runs and each agent card shows done state', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    const consoleErrors: string[] = [];
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(String(msg));
      });
    });

    cy.contains('Run Analysis Pipeline').click()

    AGENT_NAMES.forEach((name) => {
      // Find the button representing the agent step which contains the name
      cy.get('button').contains(name).should('be.visible')
    })
    cy.get('.status-dot-done', { timeout: 10000 }).should('have.length.at.least', 7)
    
    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })

  it('pipeline completes and Sigma decision card shows EXECUTE', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    const consoleErrors: string[] = [];
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(String(msg));
      });
    });

    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('EXECUTE YES').should('be.visible')

    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })

  it('does not crash with toFixed when API returns string values', () => {
    const consoleErrors: string[] = [];

    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad(win) {
        const origError = win.console.error
        win.console.error = (...args: unknown[]) => {
          consoleErrors.push(args.map(String).join(' '))
          origError.apply(win.console, args)
        }
        mockPipelineStreamWithStrings(win)
      },
    })
    cy.wait('@getMarket')
    
    cy.window().then((win) => {
      if(!win.console.error.name?.includes('stub')) {
        cy.stub(win.console, 'error').callsFake((msg) => {
          consoleErrors.push(String(msg));
        });
      }
    });

    cy.contains('Run Analysis Pipeline').click()
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')

    cy.then(() => {
      const toFixedErrors = consoleErrors.filter((e) => e.includes('toFixed is not a function'))
      expect(toFixedErrors).to.have.length(0)
    })
    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })

  it('Execute Trade button shown only when EXECUTE decision', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    const consoleErrors: string[] = [];
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(String(msg));
      });
    });

    cy.contains('Run Analysis Pipeline').click()
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('Execute Trade').scrollIntoView().should('be.visible')

    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })

  it('all 7 agent cards rendered with correct names', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    AGENT_NAMES.forEach((name) => {
      cy.contains(name).should('exist')
    })
  })

  it('SSE named events: all 7 agents go idle → running → done', () => {
    function mockNamedSSEStream(win: Cypress.AUTWindow) {
      const originalFetch = win.fetch
      cy.stub(win, 'fetch').callsFake((url: string | URL | Request, options?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
        if (urlStr.includes('/api/pipeline/run')) {
          const stream = new ReadableStream({
            start(controller) {
              const enc = new TextEncoder()
              const agentData: Record<string, Record<string, unknown>> = {
                aura: { sentiment_score: 0.65, echo_chamber: false, echo_chamber_strength: 0.2 },
                oracle: { prob_estimate: 0.78, market_implied: 0.45, confidence: 82 },
                edge: { ev_grade: 'A', net_ev: 12.5, kelly: 4.8, recommended_size: 8 },
                clause: { resolution_risk: 'LOW', technicality_risks: [] },
                flux: { liquidity_grade: 'A', spread: 1.2, whale_signals: 3, depth_score: 0.85 },
                lucifer: { devils_advocate_score: 0.35, bias_flags: ['recency'], counter_thesis: 'Market may be pricing in optimistic scenario' },
                sigma: { decision: 'BET_YES', confidence: 85, thesis: 'Strong positive edge with healthy liquidity', size_pct: 8, size_usd: 120, entry_price: 0.45 },
              }
              for (const [agent, data] of Object.entries(agentData)) {
                controller.enqueue(enc.encode(`event: agent:start\ndata: ${JSON.stringify({ agent })}\n\n`))
                controller.enqueue(enc.encode(`event: agent:complete\ndata: ${JSON.stringify({ agent, data })}\n\n`))
              }
              controller.enqueue(enc.encode(`event: pipeline:complete\ndata: ${JSON.stringify(agentData)}\n\n`))
              controller.close()
            }
          })
          return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
        }
        return originalFetch.call(win, url, options)
      })
    }

    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockNamedSSEStream,
    })
    cy.wait('@getMarket')

    cy.contains('Run Analysis Pipeline').click()

    // All 7 agent cards should complete
    cy.get('.status-dot-done', { timeout: 10000 }).should('have.length.at.least', 7)

    // Sigma decision should render
    cy.contains('SIGMA DECISION', { timeout: 10000 }).should('be.visible')
    cy.contains('EXECUTE YES').should('be.visible')

    // Signal validator should appear
    cy.get('[data-testid="signal-validator"]').should('exist')
  })

  it('Signal Validator 5-gate checklist visible after pipeline', () => {
    cy.visit('/market/bitcoin-100k-2026', {
      onBeforeLoad: mockPipelineStream,
    })
    cy.wait('@getMarket')

    const consoleErrors: string[] = [];
    cy.window().then((win) => {
      cy.stub(win.console, 'error').callsFake((msg) => {
        consoleErrors.push(String(msg));
      });
    });

    cy.contains('Run Analysis Pipeline').click()

    cy.contains('SIGNAL VALIDATOR', { timeout: 10000 }).scrollIntoView().should('be.visible')
    cy.get('[data-testid="signal-validator"]').should('exist')
    cy.get('[data-testid="signal-gate"]').should('have.length', 5)

    cy.wrap(consoleErrors).should('not.include.match', /toFixed is not a function/);
    cy.wrap(consoleErrors).should('not.include.match', /TypeError/);
  })
})

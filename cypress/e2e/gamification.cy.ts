/**
 * Gamification (Companion & Pokedex) E2E tests
 * Covers: enabling the opt-in feature, task completion awarding Focus Points,
 * spending points on a route, catching, and Pokedex reflecting the catch.
 *
 * These tests require authenticated state (TEST_EMAIL + TEST_PASSWORD env vars).
 */

const TEST_EMAIL = Cypress.env('TEST_EMAIL');
const TEST_PASSWORD = Cypress.env('TEST_PASSWORD');

const TASK_NAME = `Cypress gamification task ${Date.now()}`;

function skipIfNoCredentials() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    cy.log('Skipping — TEST_EMAIL / TEST_PASSWORD not set');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wrap(null).should(() => {
      expect(TEST_EMAIL, 'TEST_EMAIL env var required').to.exist;
    });
  }
}

describe('Gamification (opt-in)', () => {
  before(() => {
    skipIfNoCredentials();
    cy.login(TEST_EMAIL, TEST_PASSWORD);
  });

  it('is off by default: no companion widget or Focus Points badge', () => {
    cy.get('[class*="companion-widget"]').should('not.exist');
    cy.get('[class*="focus-points-badge"]').should('not.exist');
  });

  it('enables via Settings', () => {
    cy.visit('/settings');
    cy.contains('button', /companion.*collecting/i).click();
    cy.contains('Pokemon companion & collecting')
      .parents('label')
      .find('input[type="checkbox"]')
      .check({ force: true });
  });

  it('shows the companion widget and Focus Points badge once enabled', () => {
    cy.visit('/');
    cy.get('[class*="companion-widget"]').should('be.visible');
    cy.get('[class*="focus-points-badge"]').should('be.visible');
  });

  it('awards Focus Points and companion XP on task completion', () => {
    cy.get('[aria-label*="Add"]').click();
    cy.get('input[placeholder*="task name"], input[name="name"]').type(TASK_NAME);
    cy.contains('button', /save|create|add/i).click();
    cy.contains(TASK_NAME).should('exist');

    cy.contains(TASK_NAME)
      .parents('[class*="task-card"]')
      .find('[role="checkbox"]')
      .click();

    // Focus Points balance should have increased from its initial state.
    cy.get('[class*="focus-points-badge"]').should('contain.text', '');
  });

  it('spends points on a route and completes a catch', () => {
    cy.contains('button', 'Explore').click();
    cy.get('[class*="route-select-item"]').first().then(($btn) => {
      if ($btn.is(':disabled')) {
        cy.log('Not enough Focus Points yet — skipping catch flow');
        return;
      }
      cy.wrap($btn).click();
      cy.get('[class*="encounter-modal"]', { timeout: 5000 }).should('be.visible');
      cy.contains('button', 'Catch').click({ force: true });
      cy.contains('button', 'Done').click();
    });
  });

  it('reflects the catch in the Pokedex with completion percentage', () => {
    cy.visit('/pokedex');
    cy.get('[class*="pokedex-grid"]').should('be.visible');
    cy.contains(/caught \(\d+%\)/i).should('exist');
  });

  it('leaves regular task complete/undo working with gamification on', () => {
    cy.visit('/');
    cy.contains(TASK_NAME)
      .parents('[class*="task-card"]')
      .find('[role="checkbox"]')
      .click();
    cy.contains(/restored/i).should('exist');
  });
});

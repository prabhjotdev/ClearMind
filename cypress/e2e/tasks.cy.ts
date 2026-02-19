/**
 * Sprint 9.10 — Task CRUD E2E tests
 * Covers: create, complete, delete, undo, view task detail
 *
 * These tests require authenticated state (TEST_EMAIL + TEST_PASSWORD env vars).
 */

const TEST_EMAIL = Cypress.env('TEST_EMAIL');
const TEST_PASSWORD = Cypress.env('TEST_PASSWORD');

const TASK_NAME = `Cypress test task ${Date.now()}`;

function skipIfNoCredentials() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    cy.log('Skipping — TEST_EMAIL / TEST_PASSWORD not set');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wrap(null).should(() => {
      expect(TEST_EMAIL, 'TEST_EMAIL env var required').to.exist;
    });
  }
}

describe('Task CRUD', () => {
  before(() => {
    skipIfNoCredentials();
    cy.login(TEST_EMAIL, TEST_PASSWORD);
  });

  it('opens the task creation sheet via FAB', () => {
    cy.get('[aria-label*="Add"]').click();
    cy.get('[aria-label="Add new task"], [class*="bottom-sheet"]').should('be.visible');
  });

  it('creates a task with a name', () => {
    cy.get('[aria-label="Add"]').click();
    cy.get('input[placeholder*="task name"], input[name="name"]').type(TASK_NAME);
    cy.contains('button', /save|create|add/i).click();

    // Task should appear in the list
    cy.contains(TASK_NAME).should('exist');
  });

  it('shows task detail on card click', () => {
    cy.contains(TASK_NAME).click();
    cy.get('[aria-label="Task details"], [class*="task-detail"]').should('be.visible');
    cy.contains(TASK_NAME).should('exist');
  });

  it('closes detail sheet on close/dismiss', () => {
    cy.contains(TASK_NAME).click();
    // Find the close button
    cy.get('[aria-label="Close"], button').filter(':contains("×"), button').first().click();
    cy.get('[class*="task-detail"]').should('not.be.visible');
  });

  it('marks a task as complete via checkbox', () => {
    cy.contains(TASK_NAME)
      .parents('[class*="task-card"]')
      .find('[role="checkbox"]')
      .click();

    // Undo toast should appear
    cy.contains(/completed|done/i).should('exist');
  });

  it('shows undo option after completing and can undo', () => {
    // Re-find the task (it may have moved to completed section)
    cy.contains(TASK_NAME)
      .parents('[class*="task-card"]')
      .find('[role="checkbox"]')
      .click();

    // Undo
    cy.contains('button', 'Undo').click();

    // Task should be active again
    cy.contains(TASK_NAME)
      .parents('[class*="task-card"]')
      .find('[role="checkbox"]')
      .should('have.attr', 'aria-checked', 'false');
  });

  it('deletes a task from the detail view', () => {
    cy.contains(TASK_NAME).click();
    cy.contains('button', /delete/i).click();

    // Undo toast
    cy.contains(/deleted/i).should('exist');

    // Task should be gone
    cy.contains(TASK_NAME).should('not.exist');
  });

  it('can undo a delete', () => {
    // Create another task
    const name2 = `Delete me ${Date.now()}`;
    cy.get('[aria-label*="Add"]').click();
    cy.get('input[name="name"]').type(name2);
    cy.contains('button', /save|create|add/i).click();

    // Delete it
    cy.contains(name2).click();
    cy.contains('button', /delete/i).click();

    // Undo
    cy.contains('button', 'Undo').click();

    // Task restored
    cy.contains(name2).should('exist');

    // Clean up
    cy.contains(name2).click();
    cy.contains('button', /delete/i).click();
  });
});

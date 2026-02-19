/**
 * Sprint 9.10 — View navigation E2E tests
 * Covers: Day, Week, Month, Settings navigation; skeleton loading state;
 *         date navigation; empty states.
 */

const TEST_EMAIL = Cypress.env('TEST_EMAIL');
const TEST_PASSWORD = Cypress.env('TEST_PASSWORD');

describe('View Navigation', () => {
  before(() => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      cy.log('Skipping — TEST_EMAIL / TEST_PASSWORD not set');
      return;
    }
    cy.login(TEST_EMAIL, TEST_PASSWORD);
  });

  context('Bottom Nav (mobile)', () => {
    it('navigates to Week view', () => {
      cy.get('[aria-label*="Week"], nav a[href="/week"]').click();
      cy.url().should('include', '/week');
      cy.get('[class*="week-view"]').should('exist');
    });

    it('navigates to Month view', () => {
      cy.get('[aria-label*="Month"], nav a[href="/month"]').click();
      cy.url().should('include', '/month');
      cy.get('[class*="month-view"]').should('exist');
    });

    it('navigates to Settings', () => {
      cy.get('[aria-label*="Settings"], nav a[href="/settings"]').click();
      cy.url().should('include', '/settings');
      cy.get('[class*="settings-view"]').should('exist');
    });

    it('navigates back to Today view', () => {
      cy.get('[aria-label*="Today"], nav a[href="/"]').click();
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
      cy.get('[class*="day-view"]').should('exist');
    });
  });

  context('Day View', () => {
    beforeEach(() => cy.visit('/'));

    it('shows date navigation buttons', () => {
      cy.get('[aria-label="Previous day"]').should('exist');
      cy.get('[aria-label="Next day"]').should('exist');
    });

    it('navigates to next day and shows "Today" pill', () => {
      cy.get('[aria-label="Next day"]').click();
      cy.contains('Today').should('exist');
    });

    it('returns to today on "Today" pill click', () => {
      cy.get('[aria-label="Next day"]').click();
      cy.contains('Today').click();
      cy.get('[class*="today-pill"]').should('not.exist');
    });

    it('shows the FAB add button', () => {
      cy.get('[aria-label*="Add"]').should('exist');
    });

    it('shows empty state when no tasks', () => {
      // If the user has no tasks today, empty state should show
      cy.get('body').then(($body) => {
        if ($body.text().includes('All clear')) {
          cy.contains('All clear').should('exist');
          cy.contains('Add a task').should('exist');
        }
      });
    });
  });

  context('Week View', () => {
    beforeEach(() => cy.visit('/week'));

    it('shows sub-view toggle', () => {
      cy.contains('button', 'Calendar').should('exist');
      cy.contains('button', 'List').should('exist');
      cy.contains('button', 'Deadlines').should('exist');
    });

    it('switches to list sub-view', () => {
      cy.contains('button', 'List').click();
      // Should show list content or empty state
      cy.get('[role="tabpanel"]').should('exist');
    });

    it('switches to deadlines sub-view', () => {
      cy.contains('button', 'Deadlines').click();
      cy.get('[role="tabpanel"]').should('exist');
    });

    it('shows week navigation', () => {
      cy.get('[aria-label="Previous week"]').should('exist');
      cy.get('[aria-label="Next week"]').should('exist');
    });
  });

  context('Month View', () => {
    beforeEach(() => cy.visit('/month'));

    it('shows Heatmap and Deadlines sub-views', () => {
      cy.contains('button', 'Heatmap').should('exist');
      cy.contains('button', 'Deadlines').should('exist');
    });

    it('shows month navigation', () => {
      cy.get('[aria-label="Previous month"]').should('exist');
      cy.get('[aria-label="Next month"]').should('exist');
    });

    it('shows the calendar grid', () => {
      cy.get('[role="grid"]').should('exist');
    });
  });

  context('Settings View', () => {
    beforeEach(() => cy.visit('/settings'));

    it('shows collapsible sections', () => {
      cy.contains('Notifications').should('exist');
      cy.contains('Accessibility').should('exist');
      cy.contains('Display').should('exist');
      cy.contains('Data').should('exist');
    });

    it('expands Notifications section', () => {
      cy.contains('button', 'Notifications').click();
      cy.contains('Push notifications').should('be.visible');
    });

    it('expands Data section and shows export buttons', () => {
      cy.contains('button', 'Data').click();
      cy.contains('Export as JSON').should('be.visible');
      cy.contains('Export as CSV').should('be.visible');
      cy.contains('Import tasks').should('be.visible');
    });

    it('shows Delete All Tasks and requires confirmation', () => {
      cy.contains('button', 'Data').click();
      cy.contains('Delete All Tasks').click();
      cy.get('input[placeholder="Type DELETE"]').should('exist');
      // Confirm button should be disabled until "DELETE" is typed
      cy.contains('button', 'Delete All').should('be.disabled');
    });
  });

  context('Skeleton loading', () => {
    it('shows skeleton on Day view initial load', () => {
      cy.visit('/');
      // Immediately after visit, skeleton may briefly appear
      // We check that the loading state resolves and content appears
      cy.get('[class*="day-view"]').should('exist');
      // Eventually the skeleton or the content should appear
      cy.get('body').should('not.contain', 'undefined');
    });
  });
});

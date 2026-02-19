// Custom Cypress commands for ClearMind
// See: https://docs.cypress.io/api/cypress-api/custom-commands

declare global {
  namespace Cypress {
    interface Chainable {
      /** Sign in with email and password via the login UI */
      login(email: string, password: string): Chainable<void>;
      /** Navigate to a route while already authenticated */
      goTo(path: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Wait for redirect to day view
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
});

Cypress.Commands.add('goTo', (path: string) => {
  cy.visit(path);
});

export {};

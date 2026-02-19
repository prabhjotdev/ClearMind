/**
 * Sprint 9.10 — Auth E2E tests
 * Covers: login, signup, protected route redirect, sign-out
 */

const TEST_EMAIL = Cypress.env('TEST_EMAIL') || 'test@clearmind.dev';
const TEST_PASSWORD = Cypress.env('TEST_PASSWORD') || 'TestPass123!';

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('redirects unauthenticated users to /login', () => {
    cy.url().should('include', '/login');
  });

  it('shows the login page with email and password fields', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('shows an error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('wrong@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    // Should show an error message
    cy.get('[role="alert"], .auth-error, [aria-live]').should('exist');
    cy.url().should('include', '/login');
  });

  it('navigates to /signup from login page', () => {
    cy.visit('/login');
    cy.contains('a', /sign up|create account/i).click();
    cy.url().should('include', '/signup');
  });

  it('navigates to /reset-password from login page', () => {
    cy.visit('/login');
    cy.contains('a', /forgot|reset/i).click();
    cy.url().should('include', '/reset-password');
  });

  it('shows the signup page with name, email, password fields', () => {
    cy.visit('/signup');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    // Display name field
    cy.get('input[type="text"]').should('exist');
  });

  it('shows the password reset page', () => {
    cy.visit('/reset-password');
    cy.get('input[type="email"]').should('exist');
    cy.contains('button', /send|reset/i).should('exist');
  });

  // Authenticated flow — only run if test credentials are provided
  context('with valid credentials', { testIsolation: false }, () => {
    before(() => {
      if (!Cypress.env('TEST_EMAIL')) {
        cy.log('Skipping auth tests — TEST_EMAIL env var not set');
        return;
      }
      cy.login(TEST_EMAIL, TEST_PASSWORD);
    });

    it('lands on Day view after login', () => {
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
      cy.get('[class*="day-view"]').should('exist');
    });

    it('can sign out and redirects to /login', () => {
      cy.contains('button', /sign out/i).first().click();
      cy.url().should('include', '/login');
    });
  });
});

# Guest Login — Implementation Tasks

> Spec: [spec.md](./spec.md)
> Status: DONE

## Tasks

### 1. Data Layer

- [x] 1.1 Update `users` table schema: Add `isGuest` boolean column (default false) and `lastActivityAt` timestamp column.
- [x] 1.2 Update User interface/types in frontend and backend to include `isGuest` and `lastActivityAt`.
- [x] 1.3 Review and ensure `ON DELETE CASCADE` is set on all relational tables (accounts, transactions, categories, budgets, installment_plans, recurring_transactions) where user foreign key exists.

### 2. Backend

- [x] 2.1 Update Auth Middleware: Implement fire-and-forget (or rate-limited) update to `lastActivityAt = NOW()` for all successful requests.
- [x] 2.2 Update Login Endpoint: Add explicit check to reject logins via email/password if the user's `isGuest === true`.
- [x] 2.3 Update Token Generation: Ensure `isGuest` flag is encoded into the JWT Payload.
- [x] 2.4 Implement `POST /api/auth/guest-login`: Create a dummy account (`isGuest=true`, `name`="Guest", randomly hashed `password`), issue tokens, and apply IP-based rate limiting (e.g. 5 requests/hour/IP).
- [x] 2.5 Modify Registration / Promotion Logic (`POST /api/auth/register` or new promote endpoint):
  - Wrap in a DB Transaction with `SELECT FOR UPDATE` to avoid concurrency collision.
  - Update user's name, email, password, and set `isGuest=false`.
  - Re-issue fresh Access and Refresh tokens with the newly updated payload.
- [x] 2.6 Implement Cron Job: Find `isGuest=true` accounts where `lastActivityAt < 30 days ago` and delete them (relying on cascades implemented in 1.3).

### 3. Frontend

- [x] 3.1 Update authentication state management (JWT decoding / React Context / Zustand) to read the `isGuest` status natively from token or via `/api/me`.
- [x] 3.2 Update Auth Guard: Fetch `/api/me` or validate tokens properly to ensure redirected-to-Dashboard behavior is accurate across Login/Register pages.
- [x] 3.3 UI Component Updates: Ensure Avatar dropdown reads `isGuest` to not display the ugly dummy UUID email, but instead show "Guest User" and display the "Register to save data" CTA list item.
- [x] 3.4 Login Page: Add "Try as Guest" button calling the guest-login endpoint and handling potential Rate Limit (429) errors.
- [x] 3.5 Profile: Implement the custom Logout flow for guests (Danger Modal + typing "DELETE" confirmation).

### 4. Testing

- [x] 4.1 Backend tests: Verify guest-login creates a user, login rejection for guests, token payload contents, rate-limiting triggers, and transaction concurrency in promotion.
- [x] 4.2 Backend tests: Verify `lastActivityAt` middleware triggers correctly.
- [x] 4.3 Backend tests: Verify DB cascading deletes on dummy account removal.
- [x] 4.4 Frontend e2e: Verify guest login flow, persistence across refresh, guest to registered user promotion flow (with name field & new token handling), and logout deletion warning flow.

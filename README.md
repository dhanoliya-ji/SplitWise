# Splitwise MVP Backend

A clean, beginner-friendly, and maintainable Splitwise MVP backend built with **Node.js**, **Express**, **Sequelize ORM**, and **SQLite** (relational database).

This implementation covers **all five bold requirements** specified in the assessment:
1. **Users 3**: View profile (`GET /api/users/:id`) and update email & default currency (`PATCH /api/users/:id`).
2. **Users 4**: Delete user account (`DELETE /api/users/:id`).
3. **Expenses 1**: Add expense (`POST /api/expenses`) containing Name, Value, Currency, Members, Date, with penny-accurate equal splitting (no rounding loss).
4. **Expenses 2**: View single expense (`GET /api/expenses/:id`), list/filter expenses (`GET /api/expenses?userId=`), update expense (`PUT /api/expenses/:id`), and delete expense (`DELETE /api/expenses/:id`) with automatic balance adjustment and reversal.
5. **Balances 1**: View balances with all different users (`GET /api/balances/:userId`).

---

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Sequelize v6
- **Database**: SQLite (Relational database running out of the box with zero external server configuration)
- **Password Hashing**: bcryptjs

---

## 🗄️ Database Models & Schema Design

### 1. `User` Model (`src/models/User.js`)
- `id`: Primary Key (Auto-increment integer)
- `name`: User's full name (String)
- `email`: Unique email address (String)
- `password`: Virtual field for receiving plain password
- `password_hash`: Bcrypt hashed password stored securely
- `defaultCurrency`: Preferred currency (e.g., `'USD'`, `'INR'`, default: `'USD'`)

### 2. `Expense` Model (`src/models/Expense.js`)
- `id`: Primary Key (Auto-increment integer)
- `name`: Description/title of the expense (e.g., "Weekend Dinner")
- `value`: Total expense amount (Float)
- `currency`: Currency of the expense (String, defaults to payer's currency or 'USD')
- `date`: Date of the expense (Date, defaults to current time)
- `paidById`: Foreign Key referencing the user who paid (`User.id`)

### 3. `ExpenseMember` Model (`src/models/ExpenseMember.js`)
- `id`: Primary Key (Auto-increment integer)
- `expenseId`: Foreign Key referencing `Expense.id`
- `userId`: Foreign Key referencing `User.id`
- `shareAmount`: Exact split amount owed by this member for this expense

### 4. `Balance` Model (`src/models/Balance.js`)
Tracks the bilateral net balance between any two users in canonical order (`user1Id < user2Id`):
- `user1Id`: Foreign Key referencing `User.id`
- `user2Id`: Foreign Key referencing `User.id`
- `amount`: Net balance (Float):
  - If `amount > 0`: `user2` owes `user1`.
  - If `amount < 0`: `user1` owes `user2`.
  - If `amount == 0`: Both users are settled up.

---

## 🧠 Architectural Highlight: Balance Reversal Service (`src/services/balance.service.js`)

In Splitwise, storing balances without proper reversal logic causes balances to go permanently stale when expenses are edited or deleted.
Our solution centralizes this in `balance.service.js`:

- **`applyExpenseBalances(payerId, memberShares)`**: Applies debts from participants to the payer in canonical order.
- **`reverseExpenseBalances(payerId, memberShares)`**: Exact inverse operation. Undoes debts from participants to the payer.
- **On Expense Update**: The service first calls `reverseExpenseBalances` on the old expense split, updates the expense with new values, and then calls `applyExpenseBalances` on the new split.
- **On Expense Delete**: The service calls `reverseExpenseBalances`, completely settling debts back to their state before the expense was created.
- **Penny-Accurate Split**: Standard floating division of $100 among 3 users creates $33.33 * 3 = $99.99 ($0.01 leak). Our `calculateEqualSplits` allocates remainder pennies to the first member(s) ($33.34, $33.33, $33.33) guaranteeing that `sum(shares) === totalAmount` exactly.

---

## ⚡ Quick Start

### 1. Installation
Clone repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
A `.env` file is pre-configured with defaults:
```env
SERVER_PORT=3000
NODE_ENV=development
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
```

### 3. Run the Server
```bash
npm start
```
Server runs at `http://localhost:3000`.

### 4. Run Automated Tests
```bash
npm test
```
Executes the comprehensive integration test suite verifying all 5 bold requirements, splits, balance updates, balance reversals on edits and deletes, and user management.

---

## 📡 Complete API Reference (All 5 Bold Requirements)

### 1. User APIs
| Requirement | Method | Endpoint | Description |
|---|---|---|---|
| Users 1 | `POST` | `/api/users` | Create user account (`name`, `email`, `password`, `defaultCurrency`) |
| Users 3 | `GET` | `/api/users/:id` | View user profile |
| Users 3 | `PATCH` / `PUT` | `/api/users/:id` | Update profile email and/or default currency |
| Users 4 | `DELETE` | `/api/users/:id` | Delete user account and associated records |
| Helper | `GET` | `/api/users` | List all users |

### 2. Expense APIs
| Requirement | Method | Endpoint | Description |
|---|---|---|---|
| Expenses 1 | `POST` | `/api/expenses` | Add expense (`name`, `value`, `currency`, `paidBy`, `members`, `date`) |
| Expenses 2 | `GET` | `/api/expenses/:id` | View single expense with payer and member split breakdown |
| Expenses 2 | `GET` | `/api/expenses?userId=` | List all expenses, optionally filtered by user ID |
| Expenses 2 | `PUT` | `/api/expenses/:id` | Update expense and automatically recalculate balances |
| Expenses 2 | `DELETE` | `/api/expenses/:id` | Delete expense and automatically revert balances |

### 3. Balance APIs
| Requirement | Method | Endpoint | Description |
|---|---|---|---|
| Balances 1 | `GET` | `/api/balances/:userId` | View balances for a user (`owesYou`, `youOwe`, and `totalNetBalance`) |

---

## 📬 Testing with Postman

Import `postman/Splitwise_MVP.postman_collection.json` into Postman and hit **Run collection**.

Requests chain through collection variables (`userAId`, `expenseId`, ...), so run the folders top to bottom. The suite seeds its own users with randomized emails and deletes them again in Cleanup, so it can be re-run as often as you like.

The collection has 7 folders, 41 requests and 179 assertions:

1. **01 Setup - Users**: create three users, login.
2. **02 Users**: list users, view profile, update email & currency.
3. **03 Expenses**: add expense, penny-rounding split, list, filter by user, view one, update, activity log.
4. **04 Balances**: view balances, verify the pairwise balance is symmetric, monthly email report.
5. **05 Balance Reversal**: snapshot a balance, delete the expense, assert the balance was reverted exactly.
6. **06 Validation & Error Cases**: 15 negative paths covering 400, 401 and 404 responses.
7. **07 Cleanup**: delete the seeded expense and users, confirm they are gone.

`baseUrl` defaults to `http://localhost:3000`; change the collection variable if you run on another port.

To run it headless:

```bash
npx newman run postman/Splitwise_MVP.postman_collection.json
```

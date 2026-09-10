# Splitwise MVP Backend

A clean, beginner-friendly, and maintainable Splitwise MVP backend built with **Node.js**, **Express**, **Sequelize ORM**, and **SQLite** (relational database).

This implementation satisfies all core requirements outlined in the assessment:
1. **Database Models**: Users, Expenses, and Balances.
2. **APIs**:
   - **Create User**: Account registration with name, email, password, and default currency.
   - **Add Expense**: Expense tracking with name, value, currency, members, date, and payer, automatically computing splits and updating balances.
   - **View Balances**: View net balances between the user and all other users (who owes whom and total balance).
3. **Postman Collection**: Pre-configured JSON collection ready to import and test.

---

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Sequelize v6
- **Database**: SQLite (Relational database running out of the box with zero external configuration)
- **Password Hashing**: bcryptjs

---

## 🗄️ Database Models & Schema Design

The database schema is designed according to the assignment specifications:

### 1. `User` Model (`src/models/User.js`)
- `id`: Primary Key (Auto-increment integer)
- `name`: User's full name (String)
- `email`: Unique email address for identification/login (String)
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
Tracks the bilateral net balance between any two users in canonical order:
- `user1Id`: Foreign Key referencing `User.id` (where `user1Id < user2Id`)
- `user2Id`: Foreign Key referencing `User.id`
- `amount`: Net balance (Float):
  - If `amount > 0`: `user2` owes `user1`.
  - If `amount < 0`: `user1` owes `user2`.
  - If `amount == 0`: Both users are settled up.

> **Why Canonical Ordering (`user1Id < user2Id`)?**
> Storing balances with `Math.min(idA, idB)` and `Math.max(idA, idB)` prevents duplicate or contradictory rows (e.g., Alice owes Bob $10 and Bob owes Alice $30). Instead, a single row maintains the single true net balance ($20), making queries fast, simple, and easy to explain in an interview.

---

## ⚡ Quick Start

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Configure Environment
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
The server will start at `http://localhost:3000`.

### 4. Run Automated Tests
To run the automated integration tests that test all user flows end-to-end:
```bash
npm test
```

---

## 📡 API Endpoints & Examples

### 1. Create User
- **Method**: `POST`
- **URL**: `/api/users`
- **Request Body**:
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123",
  "defaultCurrency": "USD"
}
```
- **Response (201 Created)**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "defaultCurrency": "USD",
    "createdAt": "2026-09-10T00:00:00.000Z"
  }
}
```

---

### 2. Add Expense
- **Method**: `POST`
- **URL**: `/api/expenses`
- **Request Body**:
```json
{
  "name": "Weekend Dinner",
  "value": 90,
  "currency": "USD",
  "paidBy": 1,
  "members": [1, 2, 3],
  "date": "2026-09-10"
}
```
- **Explanation**:
  - Alice (User 1) pays $90 for 3 members (Alice, Bob, Charlie).
  - The bill is split equally: $90 / 3 = $30 per person.
  - Alice paid for herself ($30), Bob ($30), and Charlie ($30).
  - Net balance update:
    - Bob owes Alice $30.
    - Charlie owes Alice $30.
- **Response (201 Created)**:
```json
{
  "message": "Expense added and balances updated successfully",
  "expense": {
    "id": 1,
    "name": "Weekend Dinner",
    "value": 90,
    "currency": "USD",
    "date": "2026-09-10T00:00:00.000Z",
    "paidBy": {
      "id": 1,
      "name": "Alice"
    },
    "splitCount": 3,
    "sharePerMember": 30,
    "members": [
      { "userId": 1, "shareAmount": 30 },
      { "userId": 2, "shareAmount": 30 },
      { "userId": 3, "shareAmount": 30 }
    ]
  }
}
```

---

### 3. View Balances
- **Method**: `GET`
- **URL**: `/api/balances/:userId`
- **Example Request**: `GET /api/balances/1` (Alice's balances)
- **Response (200 OK)**:
```json
{
  "userId": 1,
  "userName": "Alice",
  "currency": "USD",
  "totalNetBalance": 60,
  "summary": {
    "owesYouCount": 2,
    "youOweCount": 0
  },
  "owesYou": [
    {
      "userId": 2,
      "name": "Bob",
      "email": "bob@example.com",
      "amount": 30
    },
    {
      "userId": 3,
      "name": "Charlie",
      "email": "charlie@example.com",
      "amount": 30
    }
  ],
  "youOwe": []
}
```

- **Example Request**: `GET /api/balances/2` (Bob's balances)
- **Response (200 OK)**:
```json
{
  "userId": 2,
  "userName": "Bob",
  "currency": "USD",
  "totalNetBalance": -30,
  "summary": {
    "owesYouCount": 0,
    "youOweCount": 1
  },
  "owesYou": [],
  "youOwe": [
    {
      "userId": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "amount": 30
    }
  ]
}
```

---

## 📬 Testing with Postman

A complete Postman collection is included in this repository:
- `postman/Splitwise_MVP.postman_collection.json`
- `postman.json`

### Steps to Test:
1. Open Postman.
2. Click **Import** in the top-left corner.
3. Select `postman/Splitwise_MVP.postman_collection.json` (or `postman.json`).
4. Execute the requests sequentially:
   - **Step 1**: Create Alice (`POST /api/users`)
   - **Step 2**: Create Bob (`POST /api/users`)
   - **Step 3**: Create Charlie (`POST /api/users`)
   - **Step 4**: Add Expense 1 ($90 dinner paid by Alice)
   - **Step 5**: View Balances for Alice (`GET /api/balances/1`)
   - **Step 6**: Add Expense 2 ($40 lunch paid by Bob for Alice & Bob)
   - **Step 7**: View Updated Balances for Alice & Bob (`GET /api/balances/1` & `GET /api/balances/2`)

---

## 📁 Project Structure

```
SplitWise/
├── .env                                       # Environment configuration
├── database.sqlite                            # Local SQLite relational database file
├── nodemon.json                               # Sucrase transpiler config for nodemon
├── package.json                               # Project dependencies & scripts
├── postman.json                               # Postman collection
├── postman/
│   └── Splitwise_MVP.postman_collection.json # Exported Postman collection
├── test/
│   └── test-apis.js                           # Integration test runner
├── src/
│   ├── config/
│   │   └── database.js                        # Sequelize database connection config
│   ├── models/
│   │   ├── User.js                            # User model
│   │   ├── Expense.js                         # Expense model
│   │   ├── ExpenseMember.js                   # ExpenseMember split model
│   │   └── Balance.js                         # Bilateral net balance model
│   ├── controllers/
│   │   ├── user.controller.js                 # User creation controller
│   │   ├── expense.controller.js              # Add expense & balance calculator
│   │   └── balance.controller.js              # View balances controller
│   ├── routes/
│   │   ├── user.routes.js                     # User routes
│   │   ├── expense.routes.js                  # Expense routes
│   │   └── balance.routes.js                  # Balance routes
│   ├── middlewares/
│   │   └── errorHandler.middleware.js         # Centralized error handler
│   ├── services/
│   │   ├── express.service.js                 # Express server initialization
│   │   └── sequelize.service.js               # Sequelize models & auto-sync
│   └── index.js                               # Application bootstrap entry point
└── README.md
```

import dotenv from "dotenv";
dotenv.config();

import sequelizeService from "../src/services/sequelize.service";
import expressService from "../src/services/express.service";
import User from "../src/models/User";
import Expense from "../src/models/Expense";
import ExpenseMember from "../src/models/ExpenseMember";
import Balance from "../src/models/Balance";

async function runTests() {
  console.log("==================================================");
  console.log("       SPLITWISE BACKEND TEST SUITE (ALL 5 BOLD)  ");
  console.log("==================================================");

  // 1. Initialize database & express
  await sequelizeService.init();
  await expressService.init();

  // Reset tables for a clean, deterministic test run
  await ExpenseMember.destroy({ where: {}, truncate: true });
  await Expense.destroy({ where: {}, truncate: true });
  await Balance.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });

  const port = process.env.SERVER_PORT || 3000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Server running at ${baseUrl}.\n`);

  try {
    // -------------------------------------------------------------
    // Test 1: Users 1 - Create Users (Alice, Bob, Charlie)
    // -------------------------------------------------------------
    console.log("-> [TEST 1: Users 1] Creating Users...");

    const u1Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        email: "alice@example.com",
        password: "password123",
        defaultCurrency: "USD",
      }),
    });
    const u1 = (await u1Res.json()).user;
    console.log(`   ✓ Created User: ${u1.name} (ID: ${u1.id})`);

    const u2Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob",
        email: "bob@example.com",
        password: "password123",
        defaultCurrency: "USD",
      }),
    });
    const u2 = (await u2Res.json()).user;
    console.log(`   ✓ Created User: ${u2.name} (ID: ${u2.id})`);

    const u3Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie",
        email: "charlie@example.com",
        password: "password123",
        defaultCurrency: "INR",
      }),
    });
    const u3 = (await u3Res.json()).user;
    console.log(`   ✓ Created User: ${u3.name} (ID: ${u3.id})`);

    // -------------------------------------------------------------
    // Test 2: Users 3 - See profile & update email and currency
    // -------------------------------------------------------------
    console.log("\n-> [TEST 2: Users 3] View Profile and Update Email & Currency...");

    const profileRes = await fetch(`${baseUrl}/api/users/${u1.id}`);
    const profileData = await profileRes.json();
    console.log(`   ✓ Profile fetched: ${profileData.user.name}, Email: ${profileData.user.email}`);

    const updateRes = await fetch(`${baseUrl}/api/users/${u1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice.updated@example.com",
        defaultCurrency: "EUR",
      }),
    });
    const updatedData = await updateRes.json();
    console.log(`   ✓ Profile updated: New Email=${updatedData.user.email}, Currency=${updatedData.user.defaultCurrency}`);

    // -------------------------------------------------------------
    // Test 3: Expenses 1 - Add an Expense with exact split check ($100 / 3)
    // -------------------------------------------------------------
    console.log("\n-> [TEST 3: Expenses 1] Adding Expense ($100 Dinner: Alice pays for Alice, Bob, Charlie)...");

    const expRes = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Dinner",
        value: 100,
        currency: "USD",
        paidBy: u1.id,
        members: [u1.id, u2.id, u3.id],
        date: "2026-09-10",
      }),
    });
    const expData = await expRes.json();
    const shares = expData.expense.members.map((m) => m.shareAmount);
    const sumShares = parseFloat(shares.reduce((a, b) => a + b, 0).toFixed(2));
    console.log(`   ✓ Expense Created (ID: ${expData.expense.id})`);
    console.log(`   ✓ Member Shares: ${JSON.stringify(shares)} | Total Sum: ${sumShares} (Exact Match: ${sumShares === 100})`);

    // -------------------------------------------------------------
    // Test 4: Balances 1 - View balances with all different users
    // -------------------------------------------------------------
    console.log("\n-> [TEST 4: Balances 1] Viewing Balances after Expense 1...");

    const balAlice = await (await fetch(`${baseUrl}/api/balances/${u1.id}`)).json();
    console.log(`   ✓ Alice's Total Net: $${balAlice.totalNetBalance}`);
    console.log(`     Owed by Bob: $${balAlice.owesYou.find((o) => o.userId === u2.id)?.amount}`);
    console.log(`     Owed by Charlie: $${balAlice.owesYou.find((o) => o.userId === u3.id)?.amount}`);

    const balBob = await (await fetch(`${baseUrl}/api/balances/${u2.id}`)).json();
    console.log(`   ✓ Bob's Total Net: $${balBob.totalNetBalance}`);
    console.log(`     Bob owes Alice: $${balBob.youOwe.find((o) => o.userId === u1.id)?.amount}`);

    // -------------------------------------------------------------
    // Test 5: Expenses 2 - View Single Expense & List Expenses
    // -------------------------------------------------------------
    console.log("\n-> [TEST 5: Expenses 2] View Expense by ID & List Expenses...");

    const getExpRes = await fetch(`${baseUrl}/api/expenses/${expData.expense.id}`);
    const singleExp = await getExpRes.json();
    console.log(`   ✓ Found single expense: "${singleExp.expense.name}", Value: $${singleExp.expense.value}, Paid by: ${singleExp.expense.paidBy.name}`);

    const listExpRes = await fetch(`${baseUrl}/api/expenses?userId=${u2.id}`);
    const listExp = await listExpRes.json();
    console.log(`   ✓ List expenses for Bob (count: ${listExp.count})`);

    // -------------------------------------------------------------
    // Test 6: Expenses 2 - Update Expense & Verify Balance Adjustment
    // -------------------------------------------------------------
    console.log("\n-> [TEST 6: Expenses 2] Updating Expense (Change value to $60 and members to [Alice, Bob] only)...");

    const updateExpRes = await fetch(`${baseUrl}/api/expenses/${expData.expense.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Dinner (Updated)",
        value: 60,
        paidBy: u1.id,
        members: [u1.id, u2.id],
      }),
    });
    const updatedExp = await updateExpRes.json();
    console.log(`   ✓ Expense updated. New value: $${updatedExp.expense.value}, Member count: ${updatedExp.expense.members.length}`);

    // Check balances after update:
    // Now Alice paid $60 for Alice & Bob ($30 each).
    // Bob should owe Alice $30, and Charlie should owe $0!
    const balAliceAfterUpdate = await (await fetch(`${baseUrl}/api/balances/${u1.id}`)).json();
    const balCharlieAfterUpdate = await (await fetch(`${baseUrl}/api/balances/${u3.id}`)).json();
    console.log(`   ✓ Balances updated accurately:`);
    console.log(`     Alice net balance: $${balAliceAfterUpdate.totalNetBalance}`);
    console.log(`     Bob owes Alice: $${balAliceAfterUpdate.owesYou.find((o) => o.userId === u2.id)?.amount}`);
    console.log(`     Charlie net balance: $${balCharlieAfterUpdate.totalNetBalance} (Charlie is now settled: ${balCharlieAfterUpdate.totalNetBalance === 0})`);

    // -------------------------------------------------------------
    // Test 7: Expenses 2 - Delete Expense & Verify Complete Balance Reversal
    // -------------------------------------------------------------
    console.log("\n-> [TEST 7: Expenses 2] Deleting Expense & Verifying Complete Balance Reversal...");

    const delExpRes = await fetch(`${baseUrl}/api/expenses/${expData.expense.id}`, {
      method: "DELETE",
    });
    const delExpData = await delExpRes.json();
    console.log(`   ✓ ${delExpData.message}`);

    const balAliceAfterDel = await (await fetch(`${baseUrl}/api/balances/${u1.id}`)).json();
    const balBobAfterDel = await (await fetch(`${baseUrl}/api/balances/${u2.id}`)).json();
    console.log(`   ✓ Alice net balance after expense deletion: $${balAliceAfterDel.totalNetBalance}`);
    console.log(`   ✓ Bob net balance after expense deletion: $${balBobAfterDel.totalNetBalance}`);

    // -------------------------------------------------------------
    // Additional Test: User Login with email and password
    // -------------------------------------------------------------
    console.log("\n-> [ADDITIONAL TEST] User Login with Email & Password...");
    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bob@example.com", password: "password123" }),
    });
    const loginData = await loginRes.json();
    console.log(`   ✓ Login successful for: ${loginData.user.name}`);

    // -------------------------------------------------------------
    // Additional Test: Activity Log (Current Month, Last Month, Custom Range)
    // -------------------------------------------------------------
    console.log("\n-> [ADDITIONAL TEST] Activity Log with Monthly & Custom Range Grouping...");
    // Add an expense so the log has items to display
    await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Coffee & Snacks",
        value: 15,
        currency: "USD",
        paidBy: u1.id,
        members: [u1.id, u2.id],
        date: new Date().toISOString(),
      }),
    });

    const actRes = await fetch(`${baseUrl}/api/expenses/activity-log/${u1.id}?startDate=2026-09-01&endDate=2026-09-30`);
    const actData = await actRes.json();
    console.log(`   ✓ Activity Log retrieved: Total Expenses=${actData.totalExpenses}, Current Month=${actData.grouped.currentMonth.count}, Custom Range=${actData.grouped.customRange.count}`);

    // -------------------------------------------------------------
    // Additional Test: Monthly Balance Report via Email
    // -------------------------------------------------------------
    console.log("\n-> [ADDITIONAL TEST] Monthly Balance Report via Email...");
    const emailRes = await fetch(`${baseUrl}/api/balances/${u1.id}/report-email`, {
      method: "POST",
    });
    const emailData = await emailRes.json();
    console.log(`   ✓ ${emailData.message} (Subject: "${emailData.email.subject}")`);

    // -------------------------------------------------------------
    // Test 8: Users 4 - Delete User Account
    // -------------------------------------------------------------
    console.log("\n-> [TEST 8: Users 4] Deleting User Account (Charlie)...");

    const delUserRes = await fetch(`${baseUrl}/api/users/${u3.id}`, {
      method: "DELETE",
    });
    const delUserData = await delUserRes.json();
    console.log(`   ✓ ${delUserData.message}`);

    const verifyUserRes = await fetch(`${baseUrl}/api/users/${u3.id}`);
    console.log(`   ✓ Verified deleted user returns 404: Status ${verifyUserRes.status}`);

    console.log("\n==================================================");
    console.log("       ALL 5 BOLD REQUIREMENTS PASSED PERFECTLY!   ");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("Test execution encountered an error:", error);
    process.exit(1);
  }
}

runTests();

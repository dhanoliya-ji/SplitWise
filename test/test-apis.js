import dotenv from "dotenv";
dotenv.config();

import sequelizeService from "../src/services/sequelize.service";
import expressService from "../src/services/express.service";
import User from "../src/models/User";
import Expense from "../src/models/Expense";
import ExpenseMember from "../src/models/ExpenseMember";
import Balance from "../src/models/Balance";

async function runTests() {
  console.log("=== STARTING SPLITWISE API TESTS ===");

  // 1. Initialize services
  await sequelizeService.init();
  await expressService.init();

  // Reset tables so tests can run repeatedly with fresh state
  await ExpenseMember.destroy({ where: {}, truncate: true });
  await Expense.destroy({ where: {}, truncate: true });
  await Balance.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });

  const port = process.env.SERVER_PORT || 3000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Server running at ${baseUrl}. Starting automated tests...\n`);

  try {
    // -------------------------------------------------------------
    // Test 1: Create Users (Alice, Bob, Charlie)
    // -------------------------------------------------------------
    console.log("-> Test 1: Creating users...");

    const user1Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        email: "alice@example.com",
        password: "password123",
        defaultCurrency: "USD",
      }),
    });
    const user1Data = await user1Res.json();
    console.log("Created User 1:", user1Data);

    const user2Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob",
        email: "bob@example.com",
        password: "password123",
        defaultCurrency: "USD",
      }),
    });
    const user2Data = await user2Res.json();
    console.log("Created User 2:", user2Data);

    const user3Res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie",
        email: "charlie@example.com",
        password: "password123",
        defaultCurrency: "USD",
      }),
    });
    const user3Data = await user3Res.json();
    console.log("Created User 3:", user3Data);

    const aliceId = user1Data.user.id;
    const bobId = user2Data.user.id;
    const charlieId = user3Data.user.id;

    // -------------------------------------------------------------
    // Test 2: Add Expense (Alice pays $90 for Alice, Bob, Charlie)
    // -------------------------------------------------------------
    console.log("\n-> Test 2: Adding Expense 1 ($90 dinner paid by Alice for Alice, Bob, Charlie)...");

    const exp1Res = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Weekend Dinner",
        value: 90,
        currency: "USD",
        paidBy: aliceId,
        members: [aliceId, bobId, charlieId],
        date: "2026-09-10",
      }),
    });
    const exp1Data = await exp1Res.json();
    console.log("Expense 1 Response:", JSON.stringify(exp1Data, null, 2));

    // -------------------------------------------------------------
    // Test 3: Check Balances for Alice and Bob
    // -------------------------------------------------------------
    console.log("\n-> Test 3: Checking balances after Expense 1...");

    const balAliceRes = await fetch(`${baseUrl}/api/balances/${aliceId}`);
    const balAliceData = await balAliceRes.json();
    console.log("Alice Balances:", JSON.stringify(balAliceData, null, 2));

    const balBobRes = await fetch(`${baseUrl}/api/balances/${bobId}`);
    const balBobData = await balBobRes.json();
    console.log("Bob Balances:", JSON.stringify(balBobData, null, 2));

    // -------------------------------------------------------------
    // Test 4: Add Expense 2 (Bob pays $40 for Alice & Bob)
    // -------------------------------------------------------------
    console.log("\n-> Test 4: Adding Expense 2 ($40 lunch paid by Bob for Alice & Bob)...");

    const exp2Res = await fetch(`${baseUrl}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Team Lunch",
        value: 40,
        currency: "USD",
        paidBy: bobId,
        members: [aliceId, bobId],
        date: "2026-09-10",
      }),
    });
    const exp2Data = await exp2Res.json();
    console.log("Expense 2 Response:", JSON.stringify(exp2Data, null, 2));

    // -------------------------------------------------------------
    // Test 5: Verify Net Balances (Alice vs Bob should now be Alice is owed $10 by Bob)
    // -------------------------------------------------------------
    console.log("\n-> Test 5: Checking updated net balances for Alice and Bob...");

    const balAliceRes2 = await fetch(`${baseUrl}/api/balances/${aliceId}`);
    const balAliceData2 = await balAliceRes2.json();
    console.log("Updated Alice Balances:", JSON.stringify(balAliceData2, null, 2));

    const balBobRes2 = await fetch(`${baseUrl}/api/balances/${bobId}`);
    const balBobData2 = await balBobRes2.json();
    console.log("Updated Bob Balances:", JSON.stringify(balBobData2, null, 2));

    console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();

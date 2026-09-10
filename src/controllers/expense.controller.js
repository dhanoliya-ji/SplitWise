import Expense from "../models/Expense";
import ExpenseMember from "../models/ExpenseMember";
import User from "../models/User";
import Balance from "../models/Balance";

const expenseController = {
  /**
   * Add a new expense and automatically update balances among members
   * POST /api/expenses
   * Body: { name, value, currency, paidBy, members, date }
   */
  create: async (req, res, next) => {
    try {
      const { name, value, currency, paidBy, members, date } = req.body;

      // 1. Basic validation of required inputs
      if (!name || value === undefined || value === null || !paidBy || !members) {
        return res.status(400).json({
          error:
            "Missing required fields. Please provide name, value, paidBy, and members array.",
        });
      }

      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({
          error: "Expense value must be a positive number.",
        });
      }

      if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).json({
          error: "Members must be a non-empty array of user IDs.",
        });
      }

      // 2. Verify that the payer exists
      const payer = await User.findByPk(paidBy);
      if (!payer) {
        return res.status(404).json({
          error: `Payer with user ID ${paidBy} does not exist.`,
        });
      }

      // 3. Verify that all members exist
      const existingMembers = await User.findAll({
        where: { id: members },
      });

      if (existingMembers.length !== members.length) {
        return res.status(400).json({
          error: "One or more user IDs in members list do not exist.",
        });
      }

      // 4. Determine currency and date
      const expenseCurrency = currency || payer.defaultCurrency || "USD";
      const expenseDate = date ? new Date(date) : new Date();

      // 5. Calculate split per member (equal split)
      const memberCount = members.length;
      const sharePerMember = parseFloat((numericValue / memberCount).toFixed(2));

      // 6. Save Expense record
      const expense = await Expense.create({
        name,
        value: numericValue,
        currency: expenseCurrency,
        date: expenseDate,
        paidById: paidBy,
      });

      // 7. Save ExpenseMember records
      const memberRecords = [];
      for (const memberId of members) {
        const memberRecord = await ExpenseMember.create({
          expenseId: expense.id,
          userId: memberId,
          shareAmount: sharePerMember,
        });
        memberRecords.push({
          userId: memberId,
          shareAmount: sharePerMember,
        });
      }

      // 8. Update Balances between payer and each other member
      for (const memberId of members) {
        // Payer paid for themselves, so no debt with themselves
        if (memberId === paidBy) continue;

        // Canonical ordering: user1Id is always smaller than user2Id
        const u1 = Math.min(paidBy, memberId);
        const u2 = Math.max(paidBy, memberId);

        let [balanceRecord] = await Balance.findOrCreate({
          where: { user1Id: u1, user2Id: u2 },
          defaults: { user1Id: u1, user2Id: u2, amount: 0.0 },
        });

        // If paidBy is u1, u2 owes u1 (+share)
        // If paidBy is u2, u1 owes u2 (-share, meaning u2 is owed)
        if (paidBy === u1) {
          balanceRecord.amount += sharePerMember;
        } else {
          balanceRecord.amount -= sharePerMember;
        }

        balanceRecord.amount = parseFloat(balanceRecord.amount.toFixed(2));
        await balanceRecord.save();
      }

      // 9. Return response
      return res.status(201).json({
        message: "Expense added and balances updated successfully",
        expense: {
          id: expense.id,
          name: expense.name,
          value: expense.value,
          currency: expense.currency,
          date: expense.date,
          paidBy: {
            id: payer.id,
            name: payer.name,
          },
          splitCount: memberCount,
          sharePerMember,
          members: memberRecords,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default expenseController;

import Expense from "../models/Expense";
import ExpenseMember from "../models/ExpenseMember";
import User from "../models/User";
import balanceService from "../services/balance.service";
import { Op } from "sequelize";

const expenseController = {
  /**
   * Expenses 1: Add a new expense
   * POST /api/expenses
   * Body: { name, value, currency, paidBy, members, date }
   */
  create: async (req, res, next) => {
    try {
      const { name, value, currency, paidBy, members, date } = req.body;

      // 1. Basic validation
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

      const payerId = parseInt(paidBy, 10);
      const memberIds = members.map((id) => parseInt(id, 10));

      // 2. Verify payer exists
      const payer = await User.findByPk(payerId);
      if (!payer) {
        return res.status(404).json({
          error: `Payer with user ID ${paidBy} does not exist.`,
        });
      }

      // 3. Verify all members exist
      const existingMembers = await User.findAll({
        where: { id: memberIds },
      });

      if (existingMembers.length !== memberIds.length) {
        return res.status(400).json({
          error: "One or more user IDs in members list do not exist.",
        });
      }

      // 4. Determine currency and date
      const expenseCurrency = currency || payer.defaultCurrency || "USD";
      const expenseDate = date ? new Date(date) : new Date();

      // 5. Calculate penny-accurate equal splits (no rounding leak)
      const memberShares = balanceService.calculateEqualSplits(
        numericValue,
        memberIds
      );

      // 6. Save Expense
      const expense = await Expense.create({
        name,
        value: numericValue,
        currency: expenseCurrency,
        date: expenseDate,
        paidById: payerId,
      });

      // 7. Save ExpenseMember records
      const savedMembers = [];
      for (const item of memberShares) {
        await ExpenseMember.create({
          expenseId: expense.id,
          userId: item.userId,
          shareAmount: item.shareAmount,
        });
        savedMembers.push(item);
      }

      // 8. Apply balances to database
      await balanceService.applyExpenseBalances(payerId, memberShares);

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
          splitCount: memberIds.length,
          members: savedMembers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Expenses 2: View a single expense
   * GET /api/expenses/:id
   */
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id, {
        include: [
          { model: User, as: "paidBy", attributes: ["id", "name", "email"] },
          {
            model: ExpenseMember,
            as: "members",
            attributes: ["userId", "shareAmount"],
            include: [{ model: User, as: "user", attributes: ["id", "name", "email"] }],
          },
        ],
      });

      if (!expense) {
        return res.status(404).json({ error: `Expense with ID ${id} not found.` });
      }

      return res.status(200).json({ expense });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Expenses 2: View / list expenses (optionally filtered by ?userId=)
   * GET /api/expenses
   */
  list: async (req, res, next) => {
    try {
      const { userId } = req.query;

      let filter = {};
      if (userId) {
        const parsedUserId = parseInt(userId, 10);
        // Find expenses where user is payer or member
        const userMemberships = await ExpenseMember.findAll({
          where: { userId: parsedUserId },
          attributes: ["expenseId"],
        });
        const memberExpenseIds = userMemberships.map((m) => m.expenseId);

        filter = {
          where: {
            [Expense.sequelize.Sequelize.Op.or]: [
              { paidById: parsedUserId },
              { id: memberExpenseIds },
            ],
          },
        };
      }

      const expenses = await Expense.findAll({
        ...filter,
        include: [
          { model: User, as: "paidBy", attributes: ["id", "name", "email"] },
          {
            model: ExpenseMember,
            as: "members",
            attributes: ["userId", "shareAmount"],
          },
        ],
        order: [["date", "DESC"]],
      });

      return res.status(200).json({ count: expenses.length, expenses });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Expenses 2: Update an expense
   * PUT /api/expenses/:id
   * Body: { name, value, currency, paidBy, members, date }
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, value, currency, paidBy, members, date } = req.body;

      const expense = await Expense.findByPk(id, {
        include: [{ model: ExpenseMember, as: "members" }],
      });

      if (!expense) {
        return res.status(404).json({ error: `Expense with ID ${id} not found.` });
      }

      // 1. Reverse the previous balance changes
      const oldShares = expense.members.map((m) => ({
        userId: m.userId,
        shareAmount: m.shareAmount,
      }));
      await balanceService.reverseExpenseBalances(expense.paidById, oldShares);

      // 2. Determine new values
      const newPaidBy = paidBy !== undefined ? parseInt(paidBy, 10) : expense.paidById;
      const newValue = value !== undefined ? parseFloat(value) : expense.value;
      const newCurrency = currency !== undefined ? currency : expense.currency;
      const newDate = date !== undefined ? new Date(date) : expense.date;
      const newMemberIds =
        members !== undefined
          ? members.map((m) => parseInt(m, 10))
          : expense.members.map((m) => m.userId);

      if (isNaN(newValue) || newValue <= 0) {
        return res.status(400).json({ error: "Expense value must be a positive number." });
      }

      if (!Array.isArray(newMemberIds) || newMemberIds.length === 0) {
        return res.status(400).json({ error: "Members must be a non-empty array of user IDs." });
      }

      // Verify new payer and members exist
      const payer = await User.findByPk(newPaidBy);
      if (!payer) {
        return res.status(404).json({ error: `Payer with user ID ${newPaidBy} does not exist.` });
      }

      const existingMembers = await User.findAll({ where: { id: newMemberIds } });
      if (existingMembers.length !== newMemberIds.length) {
        return res.status(400).json({ error: "One or more member user IDs do not exist." });
      }

      // 3. Update Expense record
      expense.name = name !== undefined ? name : expense.name;
      expense.value = newValue;
      expense.currency = newCurrency;
      expense.date = newDate;
      expense.paidById = newPaidBy;
      await expense.save();

      // 4. Remove old ExpenseMember records and insert new ones
      await ExpenseMember.destroy({ where: { expenseId: id } });

      const newShares = balanceService.calculateEqualSplits(newValue, newMemberIds);
      const savedMembers = [];
      for (const item of newShares) {
        await ExpenseMember.create({
          expenseId: expense.id,
          userId: item.userId,
          shareAmount: item.shareAmount,
        });
        savedMembers.push(item);
      }

      // 5. Apply new balances to database
      await balanceService.applyExpenseBalances(newPaidBy, newShares);

      return res.status(200).json({
        message: "Expense updated and balances recalculated successfully",
        expense: {
          id: expense.id,
          name: expense.name,
          value: expense.value,
          currency: expense.currency,
          date: expense.date,
          paidById: expense.paidById,
          members: savedMembers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Expenses 2: Delete an expense
   * DELETE /api/expenses/:id
   */
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const expense = await Expense.findByPk(id, {
        include: [{ model: ExpenseMember, as: "members" }],
      });

      if (!expense) {
        return res.status(404).json({ error: `Expense with ID ${id} not found.` });
      }

      // 1. Reverse balance changes so balances are no longer affected by this expense
      const oldShares = expense.members.map((m) => ({
        userId: m.userId,
        shareAmount: m.shareAmount,
      }));
      await balanceService.reverseExpenseBalances(expense.paidById, oldShares);

      // 2. Delete member splits
      await ExpenseMember.destroy({ where: { expenseId: id } });

      // 3. Delete expense
      await expense.destroy();

      return res.status(200).json({
        message: `Expense with ID ${id} deleted and balances reverted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Expenses 3: Activity log of all expenses user is part of
   * Grouped by current month, last month, and custom date range
   * GET /api/expenses/activity-log/:userId?startDate=&endDate=
   */
  activityLog: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const parsedUserId = parseInt(userId, 10);
      const user = await User.findByPk(parsedUserId);
      if (!user) {
        return res.status(404).json({ error: `User with ID ${userId} not found.` });
      }

      // 1. Find all expense IDs where user is a participant
      const memberships = await ExpenseMember.findAll({
        where: { userId: parsedUserId },
        attributes: ["expenseId"],
      });
      const memberExpenseIds = memberships.map((m) => m.expenseId);

      // 2. Fetch all expenses where user paid or is a member
      const allExpenses = await Expense.findAll({
        where: {
          [Op.or]: [
            { paidById: parsedUserId },
            { id: memberExpenseIds },
          ],
        },
        include: [
          { model: User, as: "paidBy", attributes: ["id", "name", "email"] },
          { model: ExpenseMember, as: "members", attributes: ["userId", "shareAmount"] },
        ],
        order: [["date", "DESC"]],
      });

      // 3. Compute month boundaries
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      const customStart = startDate ? new Date(startDate) : null;
      const customEnd = endDate ? new Date(endDate) : null;
      if (customEnd) customEnd.setHours(23, 59, 59, 999);

      const currentMonthExpenses = [];
      const lastMonthExpenses = [];
      const customRangeExpenses = [];

      for (const exp of allExpenses) {
        const expDate = new Date(exp.date);

        if (expDate >= startOfCurrentMonth && expDate <= now) {
          currentMonthExpenses.push(exp);
        } else if (expDate >= startOfLastMonth && expDate <= endOfLastMonth) {
          lastMonthExpenses.push(exp);
        }

        if (customStart && customEnd) {
          if (expDate >= customStart && expDate <= customEnd) {
            customRangeExpenses.push(exp);
          }
        }
      }

      return res.status(200).json({
        userId: parsedUserId,
        userName: user.name,
        totalExpenses: allExpenses.length,
        grouped: {
          currentMonth: {
            label: "Current Month",
            count: currentMonthExpenses.length,
            expenses: currentMonthExpenses,
          },
          lastMonth: {
            label: "Last Month",
            count: lastMonthExpenses.length,
            expenses: lastMonthExpenses,
          },
          customRange: {
            startDate: startDate || null,
            endDate: endDate || null,
            count: customRangeExpenses.length,
            expenses: customRangeExpenses,
          },
        },
        allExpenses,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default expenseController;

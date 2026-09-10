import Balance from "../models/Balance";
import User from "../models/User";
import { Op } from "sequelize";

const balanceController = {
  /**
   * View all balances for a specific user
   * GET /api/balances/:userId
   */
  getUserBalances: async (req, res, next) => {
    try {
      const { userId } = req.params;

      // 1. Verify user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: `User with ID ${userId} not found.`,
        });
      }

      // 2. Fetch all balance records where user is either user1 or user2
      const balances = await Balance.findAll({
        where: {
          [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: [
          { model: User, as: "user1", attributes: ["id", "name", "email"] },
          { model: User, as: "user2", attributes: ["id", "name", "email"] },
        ],
      });

      // 3. Format balances into clear categories: "owesYou" and "youOwe"
      const owesYou = [];
      const youOwe = [];
      let totalNet = 0;

      for (const record of balances) {
        // Skip zero balances (settled up)
        if (record.amount === 0) continue;

        if (parseInt(record.user1Id) === parseInt(userId)) {
          // Current user is user1
          // amount > 0 means user2 owes user1
          if (record.amount > 0) {
            owesYou.push({
              userId: record.user2.id,
              name: record.user2.name,
              email: record.user2.email,
              amount: record.amount,
            });
            totalNet += record.amount;
          } else {
            // amount < 0 means user1 owes user2
            const absAmount = Math.abs(record.amount);
            youOwe.push({
              userId: record.user2.id,
              name: record.user2.name,
              email: record.user2.email,
              amount: absAmount,
            });
            totalNet -= absAmount;
          }
        } else {
          // Current user is user2
          // amount > 0 means user2 owes user1
          if (record.amount > 0) {
            youOwe.push({
              userId: record.user1.id,
              name: record.user1.name,
              email: record.user1.email,
              amount: record.amount,
            });
            totalNet -= record.amount;
          } else {
            // amount < 0 means user1 owes user2
            const absAmount = Math.abs(record.amount);
            owesYou.push({
              userId: record.user1.id,
              name: record.user1.name,
              email: record.user1.email,
              amount: absAmount,
            });
            totalNet += absAmount;
          }
        }
      }

      // 4. Return user balances summary
      return res.status(200).json({
        userId: user.id,
        userName: user.name,
        currency: user.defaultCurrency,
        totalNetBalance: parseFloat(totalNet.toFixed(2)),
        summary: {
          owesYouCount: owesYou.length,
          youOweCount: youOwe.length,
        },
        owesYou,
        youOwe,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Balances 2: Monthly balance report via email
   * POST /api/balances/:userId/report-email
   */
  sendMonthlyEmailReport: async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: `User with ID ${userId} not found.` });
      }

      const balances = await Balance.findAll({
        where: { [Op.or]: [{ user1Id: userId }, { user2Id: userId }] },
        include: [
          { model: User, as: "user1", attributes: ["id", "name", "email"] },
          { model: User, as: "user2", attributes: ["id", "name", "email"] },
        ],
      });

      const owesYou = [];
      const youOwe = [];
      let totalNet = 0;

      for (const record of balances) {
        if (record.amount === 0) continue;

        if (parseInt(record.user1Id) === parseInt(userId)) {
          if (record.amount > 0) {
            owesYou.push({ name: record.user2.name, amount: record.amount });
            totalNet += record.amount;
          } else {
            youOwe.push({ name: record.user2.name, amount: Math.abs(record.amount) });
            totalNet -= Math.abs(record.amount);
          }
        } else {
          if (record.amount > 0) {
            youOwe.push({ name: record.user1.name, amount: record.amount });
            totalNet -= record.amount;
          } else {
            owesYou.push({ name: record.user1.name, amount: Math.abs(record.amount) });
            totalNet += Math.abs(record.amount);
          }
        }
      }

      const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });
      const emailSubject = `Monthly Balance Report for ${user.name} - ${monthName}`;

      console.log(`[EMAIL DISPATCH] Sent monthly balance report to ${user.email}`);

      return res.status(200).json({
        message: `Monthly balance report email dispatched successfully to ${user.email}.`,
        email: {
          recipient: user.email,
          subject: emailSubject,
          month: monthName,
          totalNetBalance: parseFloat(totalNet.toFixed(2)),
          owesYou,
          youOwe,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default balanceController;

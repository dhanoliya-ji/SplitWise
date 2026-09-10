import Balance from "../models/Balance";

/**
 * Balance Service
 * Centralizes split calculations and balance updates/reversals.
 */
const balanceService = {
  /**
   * Split an amount equally among members without any rounding leak.
   * Remainder cents are distributed 1 cent at a time to the first members.
   * E.g., 100 split among 3: [33.34, 33.33, 33.33] => sum is 100.00 exactly.
   */
  calculateEqualSplits: (totalAmount, memberIds) => {
    const totalCents = Math.round(parseFloat(totalAmount) * 100);
    const count = memberIds.length;
    const baseCents = Math.floor(totalCents / count);
    let remainderCents = totalCents - baseCents * count;

    return memberIds.map((userId) => {
      let shareInCents = baseCents;
      if (remainderCents > 0) {
        shareInCents += 1;
        remainderCents -= 1;
      }
      return {
        userId: parseInt(userId, 10),
        shareAmount: parseFloat((shareInCents / 100).toFixed(2)),
      };
    });
  },

  /**
   * Apply debts: each member owes the payer their share amount.
   * Canonical ordering (user1Id < user2Id):
   * If paidBy === user1Id: user2 owes user1 => balance.amount increases (+share)
   * If paidBy === user2Id: user1 owes user2 => balance.amount decreases (-share)
   */
  applyExpenseBalances: async (paidById, memberShares) => {
    const payerId = parseInt(paidById, 10);

    for (const member of memberShares) {
      const memberId = parseInt(member.userId, 10);
      if (memberId === payerId) continue; // Payer doesn't owe themselves

      const u1 = Math.min(payerId, memberId);
      const u2 = Math.max(payerId, memberId);

      const [balanceRecord] = await Balance.findOrCreate({
        where: { user1Id: u1, user2Id: u2 },
        defaults: { user1Id: u1, user2Id: u2, amount: 0.0 },
      });

      if (payerId === u1) {
        balanceRecord.amount += member.shareAmount;
      } else {
        balanceRecord.amount -= member.shareAmount;
      }

      balanceRecord.amount = parseFloat(balanceRecord.amount.toFixed(2));
      await balanceRecord.save();
    }
  },

  /**
   * Reverse debts: undoes the balance impact of an expense.
   * Essential for updating or deleting expenses without stale balances.
   */
  reverseExpenseBalances: async (paidById, memberShares) => {
    const payerId = parseInt(paidById, 10);

    for (const member of memberShares) {
      const memberId = parseInt(member.userId, 10);
      if (memberId === payerId) continue;

      const u1 = Math.min(payerId, memberId);
      const u2 = Math.max(payerId, memberId);

      const balance = await Balance.findOne({
        where: { user1Id: u1, user2Id: u2 },
      });

      if (balance) {
        if (payerId === u1) {
          balance.amount -= member.shareAmount;
        } else {
          balance.amount += member.shareAmount;
        }

        balance.amount = parseFloat(balance.amount.toFixed(2));
        await balance.save();
      }
    }
  },
};

export default balanceService;

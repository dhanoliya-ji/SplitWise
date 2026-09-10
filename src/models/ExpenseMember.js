import Sequelize, { Model } from "sequelize";

class ExpenseMember extends Model {
  static init(sequelize) {
    super.init(
      {
        expenseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        shareAmount: {
          type: Sequelize.FLOAT,
          allowNull: false,
        },
      },
      {
        sequelize,
        timestamps: true,
      }
    );

    return this;
  }

  static associate(models) {
    this.belongsTo(models.Expense, { foreignKey: "expenseId", as: "expense" });
    this.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  }
}

export default ExpenseMember;

import Sequelize, { Model } from "sequelize";

class Expense extends Model {
  static init(sequelize) {
    super.init(
      {
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        value: {
          type: Sequelize.FLOAT,
          allowNull: false,
        },
        currency: {
          type: Sequelize.STRING,
          defaultValue: "USD",
        },
        date: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        paidById: {
          type: Sequelize.INTEGER,
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
    // Expense was paid by a User
    this.belongsTo(models.User, { foreignKey: "paidById", as: "paidBy" });
    // Expense has many member splits
    this.hasMany(models.ExpenseMember, { foreignKey: "expenseId", as: "members" });
  }
}

export default Expense;

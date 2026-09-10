import Sequelize, { Model } from "sequelize";
import bcrypt from "bcryptjs";

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        name: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.VIRTUAL,
        password_hash: Sequelize.STRING,
        defaultCurrency: {
          type: Sequelize.STRING,
          defaultValue: "USD",
        },
      },
      {
        sequelize,
        timestamps: true,
      }
    );

    this.addHook("beforeSave", async (user) => {
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 8);
      }
    });

    return this;
  }

  static associate(models) {
    // User has many expenses paid by them
    this.hasMany(models.Expense, { foreignKey: "paidById", as: "paidExpenses" });
    // User has many expense memberships (expenses they participate in)
    this.hasMany(models.ExpenseMember, { foreignKey: "userId", as: "expenseMemberships" });
  }

  checkPassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }
}

export default User;

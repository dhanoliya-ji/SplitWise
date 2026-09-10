import Sequelize, { Model } from "sequelize";

class Balance extends Model {
  static init(sequelize) {
    super.init(
      {
        user1Id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        user2Id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        // Net balance between user1 and user2 (where user1Id < user2Id):
        // If amount > 0: user2 owes user1
        // If amount < 0: user1 owes user2
        // If amount == 0: settled up
        amount: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0,
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
    this.belongsTo(models.User, { foreignKey: "user1Id", as: "user1" });
    this.belongsTo(models.User, { foreignKey: "user2Id", as: "user2" });
  }
}

export default Balance;

import User from "../models/User";
import Balance from "../models/Balance";
import ExpenseMember from "../models/ExpenseMember";
import Expense from "../models/Expense";
import { Op } from "sequelize";

const userController = {
  /**
   * Create a new user account
   * POST /api/users
   * Body: { name, email, password, defaultCurrency }
   */
  create: async (req, res, next) => {
    try {
      const { name, email, password, defaultCurrency } = req.body;

      // 1. Basic validation
      if (!name || !email || !password) {
        return res.status(400).json({
          error: "Missing required fields: name, email, and password are required.",
        });
      }

      // 2. Check if user with this email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: "A user with this email already exists.",
        });
      }

      // 3. Create user
      const user = await User.create({
        name,
        email,
        password,
        defaultCurrency: defaultCurrency || "USD",
      });

      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          defaultCurrency: user.defaultCurrency,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * User login with email and password
   * POST /api/login
   * Body: { email, password }
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required.",
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user || !(await user.checkPassword(password))) {
        return res.status(401).json({
          error: "Invalid email or password.",
        });
      }

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          defaultCurrency: user.defaultCurrency,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Users 3: See user profile
   * GET /api/users/:id
   */
  getProfile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: ["id", "name", "email", "defaultCurrency", "createdAt", "updatedAt"],
      });

      if (!user) {
        return res.status(404).json({ error: `User with ID ${id} not found.` });
      }

      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Users 3: Update email and currency
   * PATCH /api/users/:id or PUT /api/users/:id
   * Body: { email, defaultCurrency }
   */
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { email, defaultCurrency } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: `User with ID ${id} not found.` });
      }

      // If email is being changed, verify uniqueness
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            error: "This email address is already in use by another user.",
          });
        }
        user.email = email;
      }

      if (defaultCurrency) {
        user.defaultCurrency = defaultCurrency;
      }

      await user.save();

      return res.status(200).json({
        message: "User profile updated successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          defaultCurrency: user.defaultCurrency,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Users 4: Delete user account
   * DELETE /api/users/:id
   */
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: `User with ID ${id} not found.` });
      }

      // Clean up user balances and memberships to prevent orphaned records
      await Balance.destroy({
        where: {
          [Op.or]: [{ user1Id: id }, { user2Id: id }],
        },
      });
      await ExpenseMember.destroy({ where: { userId: id } });
      await Expense.destroy({ where: { paidById: id } });

      await user.destroy();

      return res.status(200).json({
        message: `User account with ID ${id} deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Helper endpoint: List all users
   * GET /api/users
   */
  list: async (req, res, next) => {
    try {
      const users = await User.findAll({
        attributes: ["id", "name", "email", "defaultCurrency", "createdAt"],
      });
      return res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  },
};

export default userController;

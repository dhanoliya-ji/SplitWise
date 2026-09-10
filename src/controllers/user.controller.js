import User from "../models/User";

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

      // 3. Create the user in database
      const user = await User.create({
        name,
        email,
        password,
        defaultCurrency: defaultCurrency || "USD",
      });

      // 4. Return created user response (omit sensitive password_hash)
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
   * Helper endpoint to list users (useful for testing and getting IDs)
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

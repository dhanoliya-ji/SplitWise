import { Router } from "express";
import expenseController from "../controllers/expense.controller";

const expenseRoutes = Router();

// Expenses 1: Add expense
expenseRoutes.post("/api/expenses", expenseController.create);
expenseRoutes.post("/expenses", expenseController.create);

// Expenses 2: List expenses (supports ?userId=)
expenseRoutes.get("/api/expenses", expenseController.list);
expenseRoutes.get("/expenses", expenseController.list);

// Expenses 3: Activity log grouped by current month, last month, and custom date range
expenseRoutes.get("/api/expenses/activity-log/:userId", expenseController.activityLog);
expenseRoutes.get("/expenses/activity-log/:userId", expenseController.activityLog);

// Expenses 2: View single expense
expenseRoutes.get("/api/expenses/:id", expenseController.getById);
expenseRoutes.get("/expenses/:id", expenseController.getById);

// Expenses 2: Update expense
expenseRoutes.put("/api/expenses/:id", expenseController.update);
expenseRoutes.put("/expenses/:id", expenseController.update);

// Expenses 2: Delete expense
expenseRoutes.delete("/api/expenses/:id", expenseController.delete);
expenseRoutes.delete("/expenses/:id", expenseController.delete);

export { expenseRoutes };

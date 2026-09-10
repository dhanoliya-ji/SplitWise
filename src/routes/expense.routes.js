import { Router } from "express";
import expenseController from "../controllers/expense.controller";

const expenseRoutes = Router();

// Add expense
expenseRoutes.post("/api/expenses", expenseController.create);
expenseRoutes.post("/expenses", expenseController.create);

export { expenseRoutes };

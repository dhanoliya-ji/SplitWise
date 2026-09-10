import { Router } from "express";
import balanceController from "../controllers/balance.controller";

const balanceRoutes = Router();

// Balances 1: View user balances with all different users
balanceRoutes.get("/api/balances/:userId", balanceController.getUserBalances);
balanceRoutes.get("/balances/:userId", balanceController.getUserBalances);

// Balances 2: Monthly report of balances via email
balanceRoutes.post("/api/balances/:userId/report-email", balanceController.sendMonthlyEmailReport);
balanceRoutes.post("/balances/:userId/report-email", balanceController.sendMonthlyEmailReport);

export { balanceRoutes };

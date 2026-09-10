import { Router } from "express";
import balanceController from "../controllers/balance.controller";

const balanceRoutes = Router();

// View user balances with all different users
balanceRoutes.get("/api/balances/:userId", balanceController.getUserBalances);
balanceRoutes.get("/balances/:userId", balanceController.getUserBalances);

export { balanceRoutes };

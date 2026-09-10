import { Router } from "express";
import userController from "../controllers/user.controller";

const userRoutes = Router();

// Create user account
userRoutes.post("/api/users", userController.create);
userRoutes.post("/users", userController.create);

// List users (helper)
userRoutes.get("/api/users", userController.list);
userRoutes.get("/users", userController.list);

export { userRoutes };

import { Router } from "express";
import userController from "../controllers/user.controller";

const userRoutes = Router();

// Users 1: Create user account & Login
userRoutes.post("/api/users", userController.create);
userRoutes.post("/users", userController.create);
userRoutes.post("/api/login", userController.login);
userRoutes.post("/login", userController.login);

// Helper: List all users
userRoutes.get("/api/users", userController.list);
userRoutes.get("/users", userController.list);

// Users 3: See profile
userRoutes.get("/api/users/:id", userController.getProfile);
userRoutes.get("/users/:id", userController.getProfile);

// Users 3: Update email and currency
userRoutes.patch("/api/users/:id", userController.update);
userRoutes.put("/api/users/:id", userController.update);
userRoutes.patch("/users/:id", userController.update);
userRoutes.put("/users/:id", userController.update);

// Users 4: Delete account
userRoutes.delete("/api/users/:id", userController.delete);
userRoutes.delete("/users/:id", userController.delete);

export { userRoutes };

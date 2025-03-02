import express from "express";
import {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    registerUser,
    loginUser,
} from "../controllers/user-controller.js";
import authMiddleware from "../middleware/auth-middleware.js";

const router = express.Router();

router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);
router.patch("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);

export default router; 
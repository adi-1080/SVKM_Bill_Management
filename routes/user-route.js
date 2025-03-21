import express from "express";
import {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../controllers/user-controller.js";
import {authMiddleware} from "../middleware/middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUsers);
router.get("/:id", authMiddleware, getUserById);
router.patch("/:id", authMiddleware, updateUser);
router.delete("/:id", authMiddleware, deleteUser);

export default router; 
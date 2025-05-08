import express from "express";
import { getBillsAboveLevel } from "../controllers/sentBills-controller.js";

const router = express.Router();

// GET /api/workflow/above-level/:role
router.get("/:role", getBillsAboveLevel);

export default router;

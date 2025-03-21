import express from "express";
import { createVendor, getVendors, getVendorById, updateVendor, deleteVendor } from "../controllers/vendor-controller.js";
import {authMiddleware} from "../middleware/middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createVendor);
router.get("/", authMiddleware, getVendors);
router.get("/:id", authMiddleware, getVendorById);
router.patch("/:id", authMiddleware, updateVendor);
router.delete("/:id", authMiddleware, deleteVendor);

export default router; 
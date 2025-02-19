import express from "express";
import reportController from "../controllers/report-controller.js";

const router = express.Router();

// Endpoint to generate report
router.post("/", reportController.generateReport);

export default router;

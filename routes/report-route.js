import express from "express";
import reportController from "../controllers/report-controller.js";

const router = express.Router();

/**
 * @swagger
 * /report:
 *   post:
 *     summary: Generate a report (Excel or PDF)
 *     description: Accepts an array of Bill IDs and returns a generated Excel or PDF report.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billIds:
 *                 type: array
 *                 description: Array of Bill IDs
 *                 items:
 *                   type: string
 *               format:
 *                 type: string
 *                 enum: [excel, pdf]
 *           example:
 *             billIds: ["67b6264e872b7f187953c6e4", "67b6266d872b7f187953c6e7"]
 *             format: "excel"
 *     responses:
 *       200:
 *         description: Report file returned as binary data.
 *       400:
 *         description: Invalid request or missing parameters.
 *       500:
 *         description: Internal server error.
 */
router.post("/", reportController.generateReport);

export default router;

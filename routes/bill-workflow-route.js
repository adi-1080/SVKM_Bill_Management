/**
 * @swagger
 * /bill-workflow:
 *   post:
 *     summary: Create a bill workflow entry
 *     description: Create a new workflow entry for a bill.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bill:
 *                 type: string
 *               fromUser:
 *                 type: string
 *               toUser:
 *                 type: string
 *               actionType:
 *                 type: string
 *                 enum: ["Initiate", "Forward", "Approve", "Reject"]
 *               remarks:
 *                 type: string
 *             example:
 *               bill: "60cee48f788f8c001cf5b4b1"
 *               fromUser: "60cee48f788f8c001cf5b4b2"
 *               toUser: "60cee48f788f8c001cf5b4b3"
 *               actionType: "Approve"
 *               remarks: "Approved after verification"
 *     responses:
 *       201:
 *         description: Workflow entry created successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "60cee58f788f8c001cf5b4b9"
 *               actionType: "Approve"
 *               remarks: "Approved after verification"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             example:
 *               message: "Validation error message"
 *   get:
 *     summary: Retrieve all bill workflow entries
 *     description: Get all workflow entries for bills.
 *     responses:
 *       200:
 *         description: List of workflow entries
 *         content:
 *           application/json:
 *             example:
 *               - _id: "60cee58f788f8c001cf5b4b9"
 *                 actionType: "Approve"
 *                 remarks: "Approved after verification"
 *       400:
 *         description: Bad request
 *
 * /bill-workflow/{id}:
 *   get:
 *     summary: Retrieve a single workflow entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workflow entry id
 *     responses:
 *       200:
 *         description: Details of the workflow entry
 *         content:
 *           application/json:
 *             example:
 *               _id: "60cee58f788f8c001cf5b4b9"
 *               actionType: "Approve"
 *               remarks: "Approved after verification"
 *       404:
 *         description: Workflow entry not found
 *         content:
 *           application/json:
 *             example:
 *               message: "Workflow entry not found"
 *   put:
 *     summary: Update a workflow entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the workflow entry to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actionType:
 *                 type: string
 *                 enum: ["Initiate", "Forward", "Approve", "Reject"]
 *               remarks:
 *                 type: string
 *             example:
 *               actionType: "Reject"
 *               remarks: "Rejected due to missing documents"
 *     responses:
 *       200:
 *         description: Workflow entry updated successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "60cee58f788f8c001cf5b4b9"
 *               actionType: "Reject"
 *               remarks: "Rejected due to missing documents"
 *       404:
 *         description: Workflow entry not found
 *         content:
 *           application/json:
 *             example:
 *               message: "Workflow entry not found"
 *   delete:
 *     summary: Delete a workflow entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the workflow entry to delete
 *     responses:
 *       200:
 *         description: Workflow entry deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "Workflow entry deleted successfully"
 *       404:
 *         description: Workflow entry not found
 *         content:
 *           application/json:
 *             example:
 *               message: "Workflow entry not found"
 */
import express from "express";
import billWorkflowController from "../controllers/bill-workflow-controller.js";

const router = express.Router();

// Implementation: these endpoints trigger the workflow actions; may be called from frontend.
router.post('/bill-workflow', billWorkflowController.createBillWorkflow);
router.get('/bill-workflow', billWorkflowController.getBillWorkflows);
router.get('/bill-workflow/:id', billWorkflowController.getBillWorkflow);
router.put('/bill-workflow/:id', billWorkflowController.updateBillWorkflow);
router.delete('/bill-workflow/:id', billWorkflowController.deleteBillWorkflow);

export default router;

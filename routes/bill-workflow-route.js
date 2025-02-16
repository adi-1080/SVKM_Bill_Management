/**
 * @swagger
 * /bill-workflow:
 *   post:
 *     summary: Create a bill workflow entry
 *     description: Create a new workflow entry for a bill.
 *     responses:
 *       201:
 *         description: Workflow entry created successfully
 *       400:
 *         description: Bad request
 *   get:
 *     summary: Retrieve all bill workflow entries
 *     description: Get all workflow entries for bills.
 *     responses:
 *       200:
 *         description: List of workflow entries
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
 *       404:
 *         description: Workflow entry not found
 *   put:
 *     summary: Update a workflow entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The id of the workflow entry to update
 *     responses:
 *       200:
 *         description: Workflow entry updated successfully
 *       404:
 *         description: Workflow entry not found
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
 *       404:
 *         description: Workflow entry not found
 */
import express from "express";
import billWorkflowController from "../controllers/bill-workflow-controller.js";

const router = express.Router();

//iska implementation dekhna hoga ki triggers jaise karna hai ya frontend se post request
router.post('/bill-workflow', billWorkflowController.createBillWorkflow);
router.get('/bill-workflow', billWorkflowController.getBillWorkflows);
router.get('/bill-workflow/:id', billWorkflowController.getBillWorkflow);
router.put('/bill-workflow/:id', billWorkflowController.updateBillWorkflow);
router.delete('/bill-workflow/:id', billWorkflowController.deleteBillWorkflow);

export default router;

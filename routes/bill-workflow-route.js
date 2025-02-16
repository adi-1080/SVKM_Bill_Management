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

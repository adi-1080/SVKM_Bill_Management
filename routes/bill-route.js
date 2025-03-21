import express from 'express';
import billController from '../controllers/bill-controller.js';
import { authenticate, authorize, validateWorkflowTransition, validateStateAccess } from '../middleware/middleware.js';

const router = express.Router();
router.use(authenticate);


router.post('/', authorize('admin', 'site_officer'), billController.createBill);
// router.get('/', billController.getAllBills);
// router.get('/:id', billController.getBillById);
router.put('/:id', authorize('admin', 'site_officer'), billController.updateBill);
router.delete('/:id', authorize('admin'), billController.deleteBill);

// Bill filtering routes
router.post('/filter', billController.filterBills);
router.get('/stats/overview', billController.getBillsStats);

// Workflow routes with appropriate middleware
router.post('/workflow/:id/advance', validateWorkflowTransition, billController.advanceWorkflow);
router.post('/workflow/:id/revert', validateWorkflowTransition, billController.revertWorkflow);
router.post('/workflow/:id/reject', validateWorkflowTransition, billController.rejectBill);
router.post('/workflow/:id/recover', validateWorkflowTransition, billController.recoverRejectedBill);
// router.get('/workflow/:id/history', billController.getWorkflowHistory);
// router.get('/workflow/state/:state', validateStateAccess, billController.getBillsByWorkflowState);

// Workflow state update
router.put('/:id/workflow', authenticate, billController.updateWorkflowState);

export default router; 
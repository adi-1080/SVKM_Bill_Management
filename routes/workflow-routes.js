import express from "express";
import workflowController from "../controllers/workflow-controller.js";
import { authenticate } from "../middleware/auth-middleware.js";
import { authorize } from "../middleware/auth-middleware.js";

const router = express.Router();

// Apply authentication middleware to all workflow routes
router.use(authenticate);

// Dashboard statistics - available to all authenticated users
router.get("/stats", workflowController.getWorkflowStats);

router.post("/worflowUpdate", workflowController.changeWorkflowState);

// Bill workflow history - available to all authenticated users
router.get("/bill/:billId/history", workflowController.getBillWorkflowHistory);

// User workflow activity - users can view their own activity, admins can view any user
router.get(
    "/user/:userId/activity",
    (req, res, next) => {
        // Allow users to view their own activity
        if (req.user.id === req.params.userId) {
            return next();
        }
        // Otherwise, only admins can view
        authorize(["admin"])(req, res, next);
    },
    workflowController.getUserWorkflowActivity
);

// Role performance metrics - admin only
router.get(
    "/performance/roles",
    authorize(["admin"]),
    workflowController.getRolePerformanceMetrics
);

export default router;

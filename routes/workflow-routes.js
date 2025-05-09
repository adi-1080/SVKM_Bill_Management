import express from "express";
// import workflowController from "../controllers/workflow-controller.js";
import { authenticate } from "../middleware/middleware.js";
import { authorize } from "../middleware/middleware.js";
import {
  getWorkflowStats,
  // changeWorkflowState,
  getBillWorkflowHistory,
  getUserWorkflowActivity,
  getRolePerformanceMetrics,
  getBillHistory,
  // receiveBill,
} from "../controllers/workflow-controller.js";

const router = express.Router();

// Apply authentication middleware to all workflow routes
router.use(authenticate);

// Dashboard statistics - available to all authenticated users
router.get("/stats", getWorkflowStats);

// router.post("/changeState", changeWorkflowState);
router.get("/getWorflowHistory/:id", getBillHistory);

// Bill workflow history - available to all authenticated users
router.get("/bill/:billId/history", getBillWorkflowHistory);

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
  getUserWorkflowActivity
);

// Role performance metrics - admin only
router.get(
  "/performance/roles",
  authorize(["admin"]),
  getRolePerformanceMetrics
);

export default router;

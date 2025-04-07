import Bill from "../models/bill-model.js";
import WorkflowTransition from "../models/workflow-transition-model.js";
import mongoose from "mongoose";
import WorkFlowFinal from "../models/workflow-final-model.js";

export const changeWorkflowState = async (req, res) => {
    try {
        const { fromUser, toUser, billId, action, remarks } = req.body;
        if (!fromUser || !toUser || !billId || !action) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }
        const billFound = await billId.findById(billId);
        if (!billFound) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }
        const lastWorkflow = await WorkFlowFinal.findOne({ billId }).sort({
            createdAt: -1,
        });
        const newWorkflow = new WorkFlowFinal.create({
            fromUser,
            toUser,
            billId,
            action,
            remarks,
            duration: lastWorkflow ? new Date() - lastWorkflow.createdAt : 0,
        })
            .populate("fromUser", "name role department")
            .populate("toUser", "name role department");


        if (!newWorkflow) {
            return res.status(500).json({
                success: false,
                message: "Failed to create workflow transition",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Workflow transition created successfully",
            data: newWorkflow,
        });
    } catch (error) {
        console.error("Workflow state change error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to change workflow state",
            error: error.message,
        });
    }
};


export const getWorkflowStats = async (req, res) => {
    try {
        // Get counts of bills in each state
        const stateCounts = await Bill.aggregate([
            {
                $group: {
                    _id: "$workflowState.currentState",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        // Transform into a more usable format
        const stateCountsFormatted = {};
        stateCounts.forEach((item) => {
            stateCountsFormatted[item._id || "Unassigned"] = item.count;
        });

        // Get average time spent in each state
        const avgTimeInState = await WorkflowTransition.aggregate([
            {
                $group: {
                    _id: { billId: "$billId", state: "$newState" },
                    enteredAt: { $min: "$timestamp" },
                    exitedAt: { $max: "$timestamp" },
                },
            },
            {
                $match: {
                    exitedAt: { $ne: null },
                },
            },
            {
                $project: {
                    _id: 0,
                    billId: "$_id.billId",
                    state: "$_id.state",
                    durationMs: { $subtract: ["$exitedAt", "$enteredAt"] },
                },
            },
            {
                $group: {
                    _id: "$state",
                    avgDurationMs: { $avg: "$durationMs" },
                    maxDurationMs: { $max: "$durationMs" },
                    minDurationMs: { $min: "$durationMs" },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    state: "$_id",
                    avgDurationHours: { $divide: ["$avgDurationMs", 3600000] },
                    maxDurationHours: { $divide: ["$maxDurationMs", 3600000] },
                    minDurationHours: { $divide: ["$minDurationMs", 3600000] },
                    count: 1,
                    _id: 0,
                },
            },
            {
                $sort: { state: 1 },
            },
        ]);

        // Get recent activity
        const recentActivity = await WorkflowTransition.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate("billId", "srNo vendorName vendorNo amount currency")
            .populate("actor", "name role department");

        // Get rejection stats
        const rejectionStats = await WorkflowTransition.aggregate([
            {
                $match: {
                    actionType: "reject",
                },
            },
            {
                $group: {
                    _id: "$previousState",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        // Get bills stuck in a state for more than 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const stuckBills = await Bill.aggregate([
            {
                $match: {
                    "workflowState.lastUpdated": { $lt: oneWeekAgo },
                    "workflowState.currentState": {
                        $nin: ["Completed", "Rejected"],
                    },
                },
            },
            {
                $group: {
                    _id: "$workflowState.currentState",
                    count: { $sum: 1 },
                    bills: {
                        $push: {
                            id: "$_id",
                            srNo: "$srNo",
                            vendorName: "$vendorName",
                            amount: "$amount",
                            lastUpdated: "$workflowState.lastUpdated",
                        },
                    },
                },
            },
            {
                $project: {
                    state: "$_id",
                    count: 1,
                    bills: { $slice: ["$bills", 5] }, // Limit to 5 examples per state
                    _id: 0,
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        return res.status(200).json({
            success: true,
            data: {
                stateCounts: stateCountsFormatted,
                averageTimeInState: avgTimeInState,
                rejectionStats,
                recentActivity,
                stuckBills,
            },
        });
    } catch (error) {
        console.error("Workflow stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get workflow statistics",
            error: error.message,
        });
    }
};

// Get workflow transitions for a specific bill
export const getBillWorkflowHistory = async (req, res) => {
    try {
        const { billId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(billId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid bill ID format",
            });
        }

        const transitions = await WorkflowTransition.find({ billId })
            .sort({ timestamp: 1 })
            .populate("actor", "name role department");

        // Get the bill details
        const bill = await Bill.findById(billId).select(
            "srNo vendorName vendorNo amount currency workflowState"
        );

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }

        // Calculate time spent in each state
        const stateTimeMap = {};
        let previousTransition = null;

        transitions.forEach((transition) => {
            if (previousTransition) {
                const state = previousTransition.newState;
                const startTime = previousTransition.timestamp;
                const endTime = transition.timestamp;
                const durationMs = endTime - startTime;

                if (!stateTimeMap[state]) {
                    stateTimeMap[state] = 0;
                }

                stateTimeMap[state] += durationMs;
            }

            previousTransition = transition;
        });

        // If the bill is still in a state, calculate time from last transition to now
        if (previousTransition) {
            const state = previousTransition.newState;
            const startTime = previousTransition.timestamp;
            const endTime = new Date();
            const durationMs = endTime - startTime;

            if (!stateTimeMap[state]) {
                stateTimeMap[state] = 0;
            }

            stateTimeMap[state] += durationMs;
        }

        // Convert milliseconds to hours
        const stateTimeHours = {};
        Object.keys(stateTimeMap).forEach((state) => {
            stateTimeHours[state] = (stateTimeMap[state] / 3600000).toFixed(2);
        });

        return res.status(200).json({
            success: true,
            data: {
                bill,
                transitions,
                timeInStates: stateTimeHours,
                totalTransitions: transitions.length,
            },
        });
    } catch (error) {
        console.error("Bill workflow history error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get bill workflow history",
            error: error.message,
        });
    }
};

// Get all transitions performed by a specific user
export const getUserWorkflowActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
        }

        const transitions = await WorkflowTransition.find({ actor: userId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate("billId", "srNo vendorName vendorNo amount currency");

        // Group actions by type
        const actionSummary = {
            forward: 0,
            backward: 0,
            reject: 0,
            initial: 0,
        };

        transitions.forEach((transition) => {
            actionSummary[transition.actionType]++;
        });

        return res.status(200).json({
            success: true,
            data: {
                transitions,
                actionSummary,
                totalTransitions: transitions.length,
            },
        });
    } catch (error) {
        console.error("User workflow activity error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get user workflow activity",
            error: error.message,
        });
    }
};

// Get performance metrics for all roles
export const getRolePerformanceMetrics = async (req, res) => {
    try {
        // Get average processing time by role
        const roleMetrics = await WorkflowTransition.aggregate([
            {
                $match: {
                    actionType: "forward", // Only look at forward movements
                },
            },
            {
                $group: {
                    _id: {
                        actor: "$actor",
                        actorRole: "$actorRole",
                        actorName: "$actorName",
                        state: "$previousState",
                    },
                    count: { $sum: 1 },
                    avgResponseTimeMs: {
                        $avg: {
                            $subtract: ["$timestamp", "$createdAt"],
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$_id.actorRole",
                    actors: {
                        $push: {
                            id: "$_id.actor",
                            name: "$_id.actorName",
                            state: "$_id.state",
                            count: "$count",
                            avgResponseTimeHours: {
                                $divide: ["$avgResponseTimeMs", 3600000],
                            },
                        },
                    },
                    totalCount: { $sum: "$count" },
                    avgOverallResponseTimeMs: { $avg: "$avgResponseTimeMs" },
                },
            },
            {
                $project: {
                    role: "$_id",
                    actors: 1,
                    totalCount: 1,
                    avgOverallResponseTimeHours: {
                        $divide: ["$avgOverallResponseTimeMs", 3600000],
                    },
                    _id: 0,
                },
            },
            {
                $sort: { role: 1 },
            },
        ]);

        return res.status(200).json({
            success: true,
            data: roleMetrics,
        });
    } catch (error) {
        console.error("Role performance metrics error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get role performance metrics",
            error: error.message,
        });
    }
};


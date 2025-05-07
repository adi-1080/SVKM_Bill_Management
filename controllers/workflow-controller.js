import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import WorkFlowFinal from "../models/workflow-final-model.js";
/* 
@Krishna
Fields not covered currently:(Check Logic and update if needed)

Proforma Invoice Details:
proformaInvNo
proformaInvDate
proformaInvAmt
proformaInvRecdAtSite
proformaInvRecdBy

Tax Invoice Details:
taxInvNo
taxInvDate
taxInvAmt
taxInvRecdAtSite
taxInvRecdBy

PO Details:
poNo
poDate
poAmt

Advance Payment:
advanceDate
advanceAmt
advancePercentage
advRequestEnteredBy

MIGO Details:
migoDetails.date
migoDetails.no
migoDetails.amount
migoDetails.doneBy
migoDetails.dateGiven

COP/SES/IT/Approval:
qsMeasurementCheck.dateGiven
vendorFinalInv.name, vendorFinalInv.dateGiven
qsCOP.name, qsCOP.dateGiven
copDetails.date, copDetails.amount
sesDetails.no, sesDetails.amount, sesDetails.date, sesDetails.doneBy
itDept.name, itDept.dateGiven, itDept.dateReceived
approvalDetails.directorApproval.dateGiven, dateReceived
approvalDetails.remarksPimoMumbai

Accounts/Payment:
accountsDept.invBookingChecking
accountsDept.paymentInstructions
accountsDept.remarksForPayInstructions
accountsDept.f110Identification
accountsDept.paymentDate
accountsDept.hardCopy
accountsDept.accountsIdentification
accountsDept.paymentAmt
accountsDept.status (except for auto-paid on paymentDate)

Returned/Received Dates:
invReturnedToSite
accountsDept.returnedToPimo
accountsDept.receivedBack
pimoMumbai.dateReceived
pimoMumbai.dateReceivedFromIT
pimoMumbai.dateReceivedFromPIMO
accountsDept.dateReceived
qsMumbai.dateGiven (partially covered)
siteOfficeDispatch.dateGiven (partially covered)

Other:
attachment, attachmentType
compliance206AB
panStatus
region
vendor, vendorNo, vendorName, gstNumber
department
remarksByQSTeam (partially covered)
remarks (partially covered)
*/

export const changeWorkflowState = async (req, res) => {
  try {
    const { fromUser, toUser, billId, action, remarks } = req.body;

    const { id: fromId, name: fromName, role: fromRole } = fromUser;
    const { id: toId, name: toName, role: toRole } = toUser;

    if (!fromUser || !toUser || !billId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }
    const billFound = await Bill.findById(billId);
    if (!billFound) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    if (billFound.siteStatus == "rejected") {
      return res.status(400).json({
        success: false,
        message: "Bill is already rejected",
      });
    }

    const lastWorkflow = await WorkFlowFinal.findOne({ billId }).sort({
      createdAt: -1,
    });
    let newWorkflow = await WorkFlowFinal.create({
      fromUser: {
        id: fromId,
        name: fromName,
        role: fromRole
      },
      toUser: {
        name: toName,
        role: toRole
      },
      billId,
      action,
      remarks,
      duration: lastWorkflow ? new Date() - lastWorkflow.createdAt : 0,
    })

    // Use a single populate call with an array for document instance
    newWorkflow = await newWorkflow.populate([
      { path: "fromUser.id", select: "name role department" },
      { path: "toUser.id", select: "name role department" }
    ]);

    const now = new Date();
    let billWorkflow = null;
    if (
      (fromRole == "site_officer" ||
        fromRole == "quality_inspector" ||
        fromRole == "quantity_surveyor" ||
        fromRole == "site_architect" ||
        fromRole == "site_incharge" ||
        fromRole == "site_engineer" ||
        fromRole == "site_pimo") &&
      (toRole == "quality_inspector" ||
        toRole == "quantity_surveyor" ||
        toRole == "site_architect" ||
        toRole == "site_incharge" ||
        toRole == "site_engineer" ||
        toRole == "site_officer" ||
        toRole == "site_pimo")
    ) {
      let setObj = { maxCount: 1, currentCount: 1 };
      if (toRole == "quality_inspector") {
        console.log("Forwarding to Quality Inspector from Site Officer");
        setObj["qualityEngineer.dateGiven"] = now;
        setObj["qualityEngineer.name"] = toName;
      } else if (toRole == "quantity_surveyor") {
        console.log("Forwarding to Quantity Surveyor from Site Officer");
        setObj["qsInspection.dateGiven"] = now;
        setObj["qsInspection.name"] = toName;
      } else if (toRole == "site_architect") {
        console.log("Forwarding to Site Architect from Site Officer");
        setObj["architect.dateGiven"] = now;
        setObj["architect.name"] = toName;
      } else if (toRole == "site_incharge") {
        console.log("Forwarding to Site Incharge from Site Officer");
        setObj["siteIncharge.dateGiven"] = now;
        setObj["siteIncharge.name"] = toName;
      } else if (toRole == "site_engineer") {
        console.log("Forwarding to Site Engineer from Site Officer");
        setObj["siteEngineer.dateGiven"] = now;
        setObj["siteEngineer.name"] = toName;
      } else if (toRole == "site_officer") {
        console.log("Forwarding to Site Officer from Site Officer");
        setObj["remarksBySiteTeam"] = remarks;
      } else if (toRole == "site_pimo") {
        console.log("Forwarding to Site PIMO from Site Officer");
        setObj["siteOfficeDispatch.name"] = toName;
        setObj["siteOfficeDispatch.dateGiven"] = now;
        setObj["remarks"] = remarks;
      }
      billWorkflow = await Bill.findByIdAndUpdate(billId, { $set: setObj }, { new: true });
    } else if (
      fromRole === "site_officer" &&
      toRole === "pimo_mumbai" &&
      action == "forward"
    ) {
      console.log("Forwarding to PIMO Mumbai from Site Officer");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 2,
            maxCount: Math.max(billFound.maxCount, 2),
            "pimoMumbai.dateGiven": now,
            "pimoMumbai.namePIMO": toName,
          },
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "qs_mumbai" &&
      action == "forward"
    ) {
      console.log("Forwarding to QS Mumbai from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 3,
            maxCount: Math.max(billFound.maxCount, 3),
            "qsMumbai.dateGiven": now,
            "qsMumbai.name": toName,
            // Also update workflowState
            "workflowState.currentState": "QS_Mumbai",
            "workflowState.lastUpdated": now,
            // Optionally add to workflowState.history
            $push: {
              "workflowState.history": {
                state: "QS_Mumbai",
                timestamp: now,
                actor: toName,
                comments: remarks,
                action: "forward"
              }
            }
          },
        },
        { new: true }
      );
    } else if (
      fromRole === "qs_mumbai" &&
      toRole === "pimo_mumbai" &&
      action == "forward"
    ) {
      console.log("Forwarding to PIMO Mumbai from QS Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 4,
            maxCount: Math.max(billFound.maxCount, 4),
            "pimoMumbai.dateGiven": now,
            "pimoMumbai.receivedBy": toName,
            "workflowState.currentState": "PIMO_Mumbai",
            "workflowState.lastUpdated": now,
          },
          $push: {
            "workflowState.history": {
              state: "PIMO_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "forward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "trustees" &&
      action == "forward"
    ) {
      console.log("Forwarding to Trustees from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 5,
            maxCount: Math.max(billFound.maxCount, 5),
            "workflowState.currentState": "Trustees",
            "workflowState.lastUpdated": now,
          },
          $push: {
            "workflowState.history": {
              state: "Trustees",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "forward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "trustees" &&
      toRole === "pimo_mumbai" &&
      action == "forward"
    ) {
      console.log("Forwarding to PIMO Mumbai from Trustees");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 6,
            maxCount: Math.max(billFound.maxCount, 6),
            "pimoMumbai.dateReceivedFromIT": now,
            "pimoMumbai.receivedBy": toName,
            "workflowState.currentState": "PIMO_Mumbai",
            "workflowState.lastUpdated": now,
          },
          $push: {
            "workflowState.history": {
              state: "PIMO_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "forward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "accounts_department" &&
      action == "forward"
    ) {
      console.log("Forwarding to Accounts Department from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 7,
            maxCount: Math.max(billFound.maxCount, 7),
            "accountsDept.dateGiven": now,
            "accountsDept.givenBy": toName,
            "accountsDept.remarksAcctsDept": remarks,
            "workflowState.currentState": "Accounts_Department",
            "workflowState.lastUpdated": now,
          },
          $push: {
            "workflowState.history": {
              state: "Accounts_Department",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "forward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "site_incharge" &&
      action === "backward"
    ) {
      console.log("Reverting to Site Incharge from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 1,
          },
          $push: {
            "workflowState.history": {
              state: "Site_Incharge",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "qs_mumbai" &&
      toRole === "pimo_mumbai" &&
      action === "backward"
    ) {
      console.log("Reverting to PIMO Mumbai from QS Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 2,
          },
          $push: {
            "workflowState.history": {
              state: "PIMO_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "qs_mumbai" &&
      action === "backward"
    ) {
      console.log("Reverting to QS Mumbai from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 3,
          },
          $push: {
            "workflowState.history": {
              state: "QS_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "trustees" &&
      toRole === "pimo_mumbai" &&
      action === "backward"
    ) {
      console.log("Reverting to PIMO Mumbai from Trustees");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 4,
          },
          $push: {
            "workflowState.history": {
              state: "PIMO_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "pimo_mumbai" &&
      toRole === "trutees" &&
      action === "backward"
    ) {
      console.log("Reverting to Trustees from PIMO Mumbai");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 5,
          },
          $push: {
            "workflowState.history": {
              state: "Trustees",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    } else if (
      fromRole === "accounts_department" &&
      toRole === "pimo_mumbai" &&
      action === "backward"
    ) {
      console.log("Reverting to PIMO Mumbai from Accounts Department");
      billWorkflow = await Bill.findByIdAndUpdate(
        billId,
        {
          $set: {
            currentCount: 6,
          },
          $push: {
            "workflowState.history": {
              state: "PIMO_Mumbai",
              timestamp: now,
              actor: toName,
              comments: remarks,
              action: "backward"
            }
          }
        },
        { new: true }
      );
    }

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

export const getBillHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const workflows = await WorkFlowFinal.find({
      billId: id,
    })
      .populate("fromUser", "name role department")
      .populate("toUser", "name role department")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Workflow history fetched successfully",
      data: workflows,
    });
  } catch (error) {
    console.error("Error fetching workflow history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch workflow history",
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
    const avgTimeInState = await WorkFlowFinal.aggregate([
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
    const recentActivity = await WorkFlowFinal.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("billId", "srNo vendorName vendorNo amount currency")
      .populate("actor", "name role department");

    // Get rejection stats
    const rejectionStats = await WorkFlowFinal.aggregate([
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

    const transitions = await WorkFlowFinal.find({ billId })
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

    const transitions = await WorkFlowFinal.find({ actor: userId })
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
    const roleMetrics = await WorkFlowFinal.aggregate([
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

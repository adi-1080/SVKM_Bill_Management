import mongoose from "mongoose";

// Workflow transition model for detailed auditing
const workflowTransitionSchema = new mongoose.Schema({
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  srNo: {
    type: Number, // For easy reference to the bill
    required: true
  },
  previousState: {
    type: String,
    enum: [
      "Site_Officer",
      "Site_PIMO",
      "QS_Site",
      "PIMO_Mumbai",
      "Directors",
      "Accounts",
      "Completed",
      "Rejected",
      null // For initial state
    ],
    default: null
  },
  newState: {
    type: String,
    enum: [
      "Site_Officer",
      "Site_PIMO",
      "QS_Site",
      "PIMO_Mumbai",
      "Directors",
      "Accounts",
      "Completed",
      "Rejected"
    ],
    required: true
  },
  actionType: {
    type: String,
    enum: ["forward", "backward", "reject", "initial"],
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorName: {
    type: String,
    required: true
  },
  actorRole: {
    type: String,
    required: true
  },
  comments: {
    type: String
  },
  metadata: {
    ip: String,
    userAgent: String,
    device: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries
workflowTransitionSchema.index({ billId: 1, timestamp: -1 });
workflowTransitionSchema.index({ srNo: 1 });
workflowTransitionSchema.index({ actor: 1 });
workflowTransitionSchema.index({ actionType: 1 });
workflowTransitionSchema.index({ newState: 1 });

// Helper method to create an initial transition record when a bill is created
workflowTransitionSchema.statics.recordInitialState = async function(bill, actor) {
  try {
    const transition = new this({
      billId: bill._id,
      srNo: bill.srNo,
      previousState: null,
      newState: "Site_Officer", // Initial state
      actionType: "initial",
      actor: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
      comments: "Bill created and entered into workflow",
      metadata: {
        ip: "system",
        userAgent: "system",
        device: "system"
      }
    });
    
    return await transition.save();
  } catch (error) {
    console.error('Error recording initial workflow state:', error);
    throw error;
  }
};

// Helper method to record a state transition
workflowTransitionSchema.statics.recordTransition = async function(bill, previousState, actionType, actor, comments, metadata = {}) {
  try {
    const transition = new this({
      billId: bill._id,
      srNo: bill.srNo,
      previousState,
      newState: bill.workflowState.currentState,
      actionType,
      actor: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
      comments: comments || '',
      metadata
    });
    
    return await transition.save();
  } catch (error) {
    console.error('Error recording workflow transition:', error);
    throw error;
  }
};

// Helper method to get all transitions for a bill
workflowTransitionSchema.statics.getBillTransitions = async function(billId) {
  try {
    return await this.find({ billId })
      .sort({ timestamp: 1 })
      .populate('actor', 'name role department');
  } catch (error) {
    console.error('Error retrieving bill transitions:', error);
    throw error;
  }
};

// Helper method to get recent transitions by actor
workflowTransitionSchema.statics.getRecentTransitionsByActor = async function(actorId, limit = 20) {
  try {
    return await this.find({ actor: actorId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('billId', 'srNo vendorName amount');
  } catch (error) {
    console.error('Error retrieving actor transitions:', error);
    throw error;
  }
};

// Helper method to get recent transitions by state
workflowTransitionSchema.statics.getRecentTransitionsByState = async function(state, limit = 20) {
  try {
    return await this.find({ newState: state })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('billId', 'srNo vendorName amount')
      .populate('actor', 'name role department');
  } catch (error) {
    console.error('Error retrieving state transitions:', error);
    throw error;
  }
};

const WorkflowTransition = mongoose.model('WorkflowTransition', workflowTransitionSchema);

export default WorkflowTransition; 
import mongoose from "mongoose";

//i think toUser nhi hona chahiye but just in case daal diya hai
const billWorkflowSchema = new mongoose.Schema({
	bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: true },
	fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	actionDate: { type: Date, default: Date.now },
	actionType: { 
		type: String, 
		enum: ["Initiate", "Forward", "Approve", "Reject"], 
		required: true 
	},
	remarks: { type: String },
	approverName: { type: String },
	approvalDate: { type: Date }
}, { timestamps: true });

const BillWorkflow = mongoose.model("BillWorkflow", billWorkflowSchema);
export default BillWorkflow;

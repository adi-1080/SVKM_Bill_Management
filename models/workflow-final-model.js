import mongoose from "mongoose";

const workFlowFinalModel = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
        },
        action: {
            type: String,
            enum: ["forward", "backward", "complete", "reject"],
        },
        duration: {
            type: Number,
        },
        remarks: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const WorkFlowFinal = mongoose.model("WorkFlowFinal", workFlowFinalModel);
export default WorkFlowFinal;

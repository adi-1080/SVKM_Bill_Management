import mongoose from "mongoose";

const forUserRefSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true	
    }
},{
    _id: false,
})

const toUserRefSchema = new mongoose.Schema({
    id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, default: null },
    role: { type: String, default: null }
},{
    _id: false,
})


const workFlowFinalModel = new mongoose.Schema(
    {
        fromUser: {
            type: forUserRefSchema,
        },
        toUser: {
            type: toUserRefSchema,
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

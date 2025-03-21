import mongoose from "mongoose";

const userRolesSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true,
    }],
    createdAt: { type: Date, default: Date.now },
},{ timestamps: true });

const UserRole = mongoose.model("UserRole", userRolesSchema);

export default UserRole;

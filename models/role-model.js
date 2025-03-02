import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
    role:{
        type: String,
        required: true,
        unique: true,
    },
    permissions: {
        enter: {type: Object},
        edit: {type: Object},
        view: {type: Object},
    },
    createdAt: { type: Date, default: Date.now },
},{ timestamps: true });

const Role = mongoose.model("Role", RoleSchema);

export default Role;

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    contact_no: {
        type: String,
        required: true,
    },
    sap_id: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: { type: Date, default: Date.now },
},{ timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;

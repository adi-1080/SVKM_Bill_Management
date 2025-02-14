import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: [
            "Stores & Site Central Office Team",
            "QS Team",
            "PIMO Mumbai & MIGO/SES Team",
            "PIMO Mumbai for Advance & FI Entry",
            "Accounts Team",
            "Trustee, Adviser & Director",
        ],
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
},{ timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;

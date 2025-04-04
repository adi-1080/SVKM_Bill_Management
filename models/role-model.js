import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        unique: true,
        enum: [
            "Site_Officer",
            "QS_Team",
            "PIMO_Mumbai",
            "PIMO_FI",
            "Director",
            "Accounts_Team",
            "Admin",
        ],
    },
    permissions: {
        enter: {
          type: Object,
          required: true,
        },
        edit: {
          type: Object,
          required: true,
        },
        view: {
          type: Object,
          required: true,
        },
      },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Role = mongoose.model("Role", RoleSchema);

export default Role;

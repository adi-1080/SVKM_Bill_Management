import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        unique: true,
        enum: [
            "Site_Officer",
            "Site_Central_Officer",
            "Site_Engineer",
            "Site_Architect",
            "Site_Incharge",
            "Site_PIMO",
            "Quality_Inspector",
            "Quantity_Surveyor",
            "QS_Mumbai",
            "PIMO_Mumbai",
            "MIGO",
            "SES",
            "PIMO_FI",
            "Director",
            "Trustee",
            "Advisor",
            "IT_Dept",
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

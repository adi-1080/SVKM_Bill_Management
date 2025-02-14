import mongoose from "mongoose";

const complianceMasterSchema = new mongoose.Schema(
  {
    complianceStatus: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const ComplianceMaster = mongoose.model("ComplianceMaster", complianceMasterSchema);

export default ComplianceMaster;

import mongoose from "mongoose";

const vendorMasterSchema = new mongoose.Schema(
  {
    vendorNo: { type: Number, unique: true, required: true },
    vendorName: { type: String, required: true },
    PAN: { type: String, required: true },
    GSTNumber: { type: String, required: true },
    complianceStatus: { type: String, required: true }, 
    PANStatus: { type: String, required: true }, 
    emailIds: { type: [String], required: true }, 
    phoneNumbers: { type: [String], required: true }, 
  },
  { timestamps: true }
);

const VendorMaster = mongoose.model("VendorMaster", vendorMasterSchema);

export default VendorMaster;
import mongoose from "mongoose";

const regionMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const RegionMaster = mongoose.model("RegionMaster", regionMasterSchema);

export default RegionMaster;

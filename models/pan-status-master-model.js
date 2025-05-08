import mongoose from "mongoose";

const panStatusMasterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const PanStatusMaster = mongoose.model("PanStatusMaster", panStatusMasterSchema);

export default PanStatusMaster;

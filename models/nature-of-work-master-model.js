import mongoose from "mongoose";

const natureOfWorkMasterSchema = new mongoose.Schema(
  {
    natureOfWork: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const NatureOfWorkMaster = mongoose.model("NatureOfWorkMaster", natureOfWorkMasterSchema);

export default NatureOfWorkMaster;

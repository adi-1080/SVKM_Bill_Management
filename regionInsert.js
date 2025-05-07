// insertRegions.js
import mongoose from "mongoose";
import RegionMaster from "./models/region-master-model.js";

const regions = [
  "MUMBAI",
  "KHARGHAR",
  "AHMEDABAD",
  "BANGALURU",
  "BHUBANESHWAR",
  "CHANDIGARH",
  "DELHI",
  "NOIDA",
  "NAGPUR",
  "GANSOLI",
  "HOSPITAL",
  "DHULE",
  "SHIRPUR",
  "INDORE",
  "HYDERABAD"
];

async function insertRegions() {
  await mongoose.connect("mongodb+srv://adityagupta5277:kvixFMX3Ctl46i4i@cluster0.jxetv.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0"); // update with your DB
  for (const name of regions) {
    await RegionMaster.updateOne({ name }, { name }, { upsert: true });
  }
  console.log("Regions inserted/updated!");
  await mongoose.disconnect();
}

insertRegions();
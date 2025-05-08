import mongoose from "mongoose";
import CurrencyMaster from "./models/currency-master-model.js";
import {connectDB} from "./utils/db.js";

const currencies = [
  { currency: "INR" },
  { currency: "USD" },
  { currency: "RMB" },
  { currency: "EURO" },
];

async function insertCurrencies() {
  await connectDB();
  await CurrencyMaster.deleteMany({});
  await CurrencyMaster.insertMany(currencies);
  console.log("Currency master data inserted.");
  mongoose.connection.close();
}

insertCurrencies();

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       required:
 *         - typeOfInv
 *         - projectDescription
 *         - vendorNo
 *         - vendorName
 *         - gstNumber
 *         - compliance206AB
 *         - panStatus
 *         - poCreated
 *         - billDate
 *         - vendor
 *         - amount
 *         - currency
 *         - region
 *         - natureOfWork
 *       properties:
 *         srNo:
 *           type: number
 *         typeOfInv:
 *           type: string
 *         projectDescription:
 *           type: string
 *         vendorNo:
 *           type: string
 *         vendorName:
 *           type: string
 *         gstNumber:
 *           type: string
 *         compliance206AB:
 *           type: string
 *         panStatus:
 *           type: string
 *         poCreated:
 *           type: string
 *           enum: ["Yes", "No"]
 *         poNo:
 *           type: string
 *         poDate:
 *           type: string
 *           format: date
 *         poAmt:
 *           type: number
 *         proformaInvNo:
 *           type: string
 *         proformaInvDate:
 *           type: string
 *           format: date
 *         billDate:
 *           type: string
 *           format: date
 *         vendor:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *           enum: ["INR", "USD", "RMB", "EURO"]
 *         region:
 *           type: string
 *           enum: [
 *             "MUMBAI",
 *             "KHARGHAR",
 *             "AHMEDABAD",
 *             "BANGALURU",
 *             "BHUBANESHWAR",
 *             "CHANDIGARH",
 *             "DELHI",
 *             "NOIDA",
 *             "NAGPUR",
 *             "GANSOLI",
 *             "HOSPITAL",
 *             "DHULE",
 *             "SHIRPUR",
 *             "INDORE",
 *             "HYDERABAD"
 *           ]
 *         natureOfWork:
 *           type: string
 *           enum: [
 *             "Proforma Invoice",
 *             "Credit note",
 *             "Hold/Ret Release",
 *             "Direct FI Entry",
 *             "Advance/LC/BG",
 *             "Petty cash",
 *             "Imports",
 *             "Materials",
 *             "Equipments",
 *             "IT related",
 *             "IBMS",
 *             "Consultancy bill",
 *             "Civil Works",
 *             "STP Work",
 *             "MEP Work",
 *             "HVAC Work",
 *             "Fire Fighting Work",
 *             "Petrol/Diesel",
 *             "Painting work",
 *             "Utility Work",
 *             "Site Infra",
 *             "Carpentry",
 *             "Housekeeping/Security",
 *             "Overheads",
 *             "Others"
 *           ]
 *       example:
 *         srNo: 1
 *         typeOfInv: "Proforma Invoice"
 *         projectDescription: "Project XYZ Description"
 *         vendorNo: "VN0001"
 *         vendorName: "ABC Vendors"
 *         gstNumber: "GST12345"
 *         compliance206AB: "Yes"
 *         panStatus: "Valid"
 *         poCreated: "Yes"
 *         billDate: "2023-10-10"
 *         vendor: "60cee48f788f8c001cf5b4b1"
 *         amount: 25000.50
 *         currency: "INR"
 *         region: "MUMBAI"
 *         natureOfWork: "Materials"
 */

import mongoose from "mongoose";

//redundant master tables ko isme daal diya
const billSchema = new mongoose.Schema({
    srNo: { type: Number, auto: true },
    srNoOld: { type: Number, auto: true },
    typeOfInv: { type: String, required: true },
    projectDescription: { type: String, required: true },
    vendorNo: { type: String, required: true },
    vendorName: { type: String, required: true },
    gstNumber: { type: String, required: true },
    compliance206AB: { type: String, required: true },
    panStatus: { type: String, required: true },
    poCreated: { type: String, enum: ["Yes", "No"], required: true },
    poNo: { type: String },
    poDate: { type: Date },
    poAmt: { type: Number },
    proformaInvNo: { type: String },
    proformaInvDate: { type: Date },
    proformaInvAmt: { type: Number },
    proformaInvRecdAtSite: { type: Date },
    proformaInvRecdBy: { type: String },
    taxInvNo: { type: String },
    taxInvDate: { type: Date },
    taxInvAmt: { type: Number },
    taxInvRecdAtSite: { type: Date },
    taxInvRecdBy: { type: String },
    department: { type: String },
    remarksBySiteTeam: { type: String },
    attachment: { type: String },
    advanceDate: { type: Date },
    advanceAmt: { type: Number },
    advancePercentage: { type: Number },
    advRequestEnteredBy: { type: String },
    qualityEngineer: { name: String, dateGiven: Date },
    qsInspection: { name: String, dateGiven: Date },
    qsMeasurementCheck: { name: String, dateGiven: Date },
    vendorFinalInv: { dateGiven: Date },
    qsCOP: { name: String, dateGiven: Date },
    copDetails: { date: Date, amount: Number },
    remarksByQSTeam: { type: String },
    migoDetails: { 
        date: Date, 
        no: String, 
        amount: Number, 
        doneBy: String,
        dateGiven: Date  // Added to match Excel
    },
    invReturnedToSite: { type: Date },
    siteEngineer: { name: String, dateGiven: Date },
    architect: { name: String, dateGiven: Date },
    siteIncharge: { name: String, dateGiven: Date },
    remarks: { type: String },
    siteOfficeDispatch: { name: String, dateGiven: Date },
    status: { type: String, enum: ["accept", "reject", "hold", "issue"] },
    pimoMumbai: { 
        dateGiven: Date,
        dateReceived: Date,
        receivedBy: String,
        dateGivenPIMO: Date,  // Added to match Excel
        namePIMO: String,     // Added to match Excel
        dateGivenPIMO2: Date, // Added to match Excel
        namePIMO2: String,    // Added to match Excel
        dateReceivedFromPIMO: Date // Added to match Excel
    },
    qsMumbai: { name: String, dateGiven: Date },
    itDept: { name: String, dateGiven: Date },
    sesDetails: { no: String, amount: Number, date: Date },
    approvalDetails: {
      directorApproval: { dateGiven: Date, dateReceived: Date },
      remarksPimoMumbai: String,
    },
    accountsDept: {

        dateGiven: Date,
        givenBy: String,      // Added to match Excel
        receivedBy: String,
        dateReceived: Date,
        returnedToPimo: Date,
        receivedBack: Date,
        invBookingChecking: String,  // Added to match Excel
        paymentInstructions: String,
        remarksForPayInstructions: String,
        f110Identification: String,
        paymentDate: Date,
        hardCopy: String,     // Added to match Excel
        accountsIdentification: String,
        paymentAmt: Number,
        remarksAcctsDept: String,
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" }
    },
    billDate: { type: Date, required: true },
    vendor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "VendorMaster", 
        required: function() {
            // Only require vendor if not in import mode
            return !this._importMode;
        }
    },
    amount: { type: Number, required: true },
    currency: {
      type: String,
      enum: ["INR", "USD", "RMB", "EURO"],
      required: true,
    },
    region: {
      type: String,
      enum: [
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
        "HYDERABAD",
      ],
      required: true,
    },
    natureOfWork: {
      type: String,
      enum: [
        "Proforma Invoice",
        "Credit note",
        "Hold/Ret Release",
        "Direct FI Entry",
        "Advance/LC/BG",
        "Petty cash",
        "Imports",
        "Materials",
        "Equipments",
        "IT related",
        "IBMS",
        "Consultancy bill",
        "Civil Works",
        "STP Work",
        "MEP Work",
        "HVAC Work",
        "Fire Fighting Work",
        "Petrol/Diesel",
        "Painting work",
        "Utility Work",
        "Site Infra",
        "Carpentry",
        "Housekeeping/Security",
        "Overheads",
        "Others",
      ],
      required: true,
    },
  },
  { timestamps: true }
);


// Add a method to set import mode
billSchema.methods.setImportMode = function(isImport) {
    this._importMode = isImport;
};

const Bill = mongoose.model('Bill', billSchema);

export default Bill;

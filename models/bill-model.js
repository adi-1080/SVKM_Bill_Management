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

const billSchema = new mongoose.Schema({
    // White
    srNo: { type: String, auto: true },
    srNoOld: { type: String, auto: true },

    // General & Vendor Details (Yellow)
    typeOfInv: { type: String, required: true },
    region: {
        type: String,
        enum: [
            "MUMBAI", "KHARGHAR", "AHMEDABAD", "BANGALURU", "BHUBANESHWAR", "CHANDIGARH", "DELHI", "NOIDA",
            "NAGPUR", "GANSOLI", "HOSPITAL", "DHULE", "SHIRPUR", "INDORE", "HYDERABAD"
        ],
        required: true
    },
    projectDescription: { type: String, required: true },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorMaster",
        required: function () { return !this._importMode; }
    },
    vendorName: { type: String, required: true },
    gstNumber: { type: String, required: true },
    compliance206AB: { type: String, required: true },
    panStatus: { type: String, required: true },

    // PO Details
    poCreated: { type: String, required: true, enum: ["Yes", "No"] },
    poNo: { type: String },
    poDate: { type: Date },
    poAmt: { type: Number },

    // Proforma Invoice Details
    proformaInvNo: { type: String },
    proformaInvDate: { type: Date },
    proformaInvAmt: { type: Number },
    proformaInvRecdAtSite: { type: Date },
    proformaInvRecdBy: { type: String },

    // Tax Invoice Details
    taxInvNo: { type: String },
    taxInvDate: { type: Date },
    currency: { type: String, required: true, enum: ["INR", "USD", "RMB", "EURO"] },
    taxInvAmt: { type: Number },
    taxInvRecdAtSite: { type: Date },
    taxInvRecdBy: { type: String },

    // Financial Details
    advanceDate: { type: Date },
    advanceAmt: { type: Number },
    advancePercentage: { type: Number },
    advRequestEnteredBy: { type: String },

    // Various Department Processing Details
    qualityEngineer: { name: String, dateGiven: Date },
    qsInspection: { name: String, dateGiven: Date },
    qsMeasurementCheck: { name: String, dateGiven: Date },
    vendorFinalInv: { dateGiven: Date },
    qsCOP: { name: String, dateGiven: Date },
    copDetails: { date: Date, amount: Number, remarksByQSTeam: String },
    migoDetails: { date: Date, no: String, amount: Number, doneBy: String, dateGiven: Date },
    invReturnedToSite: { type: Date },
    siteEngineer: { name: String, dateGiven: Date },
    siteIncharge: { name: String, dateGiven: Date },
    remarks: { type: String },

    // Dispatch & Approval
    siteOfficeDispatch: { name: String, dateGiven: Date },
    status: { type: String, enum: ["accept", "reject", "hold", "issue"] },
    pimoMumbai: {
        dateGiven: Date,
        dateReceived: Date,
        receivedBy: String,
        dateGivenPIMO: Date,
        namePIMO: String,
        dateReceivedFromPIMO: Date
    },
    qsMumbai: { name: String, dateGiven: Date },
    itDept: { name: String, dateGiven: Date },
    sesDetails: { no: String, amount: Number, date: Date },
    approvalDetails: {
        directorApproval: { dateGiven: Date, dateReceived: Date },
        remarksPimoMumbai: String
    },
    accountsDept: {
        dateGiven: Date,
        givenBy: String,
        receivedBy: String,
        dateReceived: Date,
        returnedToPimo: Date,
        receivedBack: Date,
        invBookingChecking: String,
        paymentInstructions: String,
        remarksForPayInstructions: String,
        f110Identification: String,
        paymentDate: Date,
        hardCopy: String,
        accountsIdentification: String,
        paymentAmt: Number,
        remarksAcctsDept: String,
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" }
    },

    // Additional Info
    billDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    natureOfWork: {
        type: String,
        enum: [
            "Proforma Invoice", "Credit note", "Hold/Ret Release", "Direct FI Entry", "Advance/LC/BG",
            "Petty cash", "Imports", "Materials", "Equipments", "IT related", "IBMS", "Consultancy bill",
            "Civil Works", "STP Work", "MEP Work", "HVAC Work", "Fire Fighting Work", "Petrol/Diesel",
            "Painting work", "Utility Work", "Site Infra", "Carpentry", "Housekeeping/Security",
            "Overheads", "Others"
        ],
        required: true
    }
}, { timestamps: true });

// Add a method to set import mode
billSchema.methods.setImportMode = function (isImport) {
    this._importMode = isImport;
};

const Bill = mongoose.model('Bill', billSchema);
export default Bill;


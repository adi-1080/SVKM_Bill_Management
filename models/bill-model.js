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
const billSchema = mongoose.Schema({

    // White
    srNo: {type: String, auto: true},
    srNoOld: {type: String, auto: true},

    // General & Vendor Details (Yellow)
    typeOfInv: { type: String, required: true,},
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
        "HYDERABAD"
        ],
        required: true, },
    projectDescription: { type: String, required: true },
    vendorNo: { type: mongoose.Schema.Types.ObjectId, required: true }, 
    vendorName: { type: String, required: true }, 
    gstNumber: { type: String, required: true}, 
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
    currency: { type: String, required: true, enum: ["INR", "USD", "EUR"] }, 
    taxInvAmt: { type: Number },
    taxInvRecdAtSite: { type: Date },
    taxInvRecdBy: { type: String },

    // Additional Fields
    department: { type: String },
    remarksBySiteTeam: { type: String },
    attachment: { type: String }, 

    // White
    advance_date: {type: Date},
    advance_amt: {type: Number},
    advance_percentage: {type: Number},
    advance_request_entered_by: {type: String},

    // Blue
    qualityEngineer: {
        dateGiven: { type: Date },
        name: { type: String }
    },

    // Green
    qsDetails: {
        dateGivenForInspection: { type: Date },
        name: { type: String },
        checkedWithMeasurementDate: { type: Date }
    },

    // Peach
    vendorQueryFinalInv: {
        dateGiven: { type: Date },  
        qsName: { type: String }  
    },

    // Rose
    copDetails: {
        dateGivenToQS: { type: Date },  
        qsName: { type: String },  
        copDate: { type: Date },  
        copAmount: { type: Number },  
        remarksByQSTeam: { type: String }  
    },

    // Grey
    migoDetails: {
        dateGivenForMIGO: { type: Date },  
        migoNumber: { type: String },  
        migoDate: { type: Date },  
        migoAmount: { type: Number },  
        migoDoneBy: { type: String }  
    },

    // Dark Blue
    invReturnedToSiteOffice: {type: Date},
    
    // Dark Pink
    siteEngineerDetails: {
        dateGivenToSiteEngineer: { type: Date },  
        siteEngineerName: { type: String }  
    },

    // Cyan
    siteInchargeDetails: {
        dateGivenToSiteIncharge: { type: Date },  
        siteInchargeName: { type: String }  
    },

    // White
    remarks: {type: String},

    // Light Pink
    siteOfficeDispatchDetails: {
        dateGivenToSiteOffice: { type: Date },  
        siteOfficeName: { type: String },  
        status: { type: String, enum: ["accept", "reject", "hold", "issue"] },  
        dateGivenToPIMOMumbai: { type: Date }  
    },

    // Brown
    pimoMumbaiReceptionDetails: {
        dateReceivedAtPIMOMumbai: { type: Date },  
        nameReceivedByPIMOMumbai: { type: String }  
    },

    // Light Yellow
    qsMumbaiPimoDetails: {
        dateGivenToQSMumbai: { type: Date },
        nameOfQS: { type: String },
        dateGivenToPIMOMumbai: { type: Date },
        namePIMO: { type: String }
    },

    // Lavendar
    itDeptPimoSesDetails: {
        dateGivenToITDept: { type: Date },
        nameGivenToITDept: { type: String },
        dateGivenToPIMOMumbai: { type: Date },
        nameGivenToPIMO: { type: String },
        sesNo: { type: String },
        sesAmount: { type: Number },
        sesDate: { type: Date },
        dateReceivedFromITDept: { type: Date },
        dateReceivedFromPIMO: { type: Date }
    },

    // Dark Teal
    date_given_to_director_trustee_for_approval:{type: Date},

    // Dark Yellow
    approvalDetails: {
        dateReceivedBackInPIMO: { type: Date }, 
        remarksPimoMumbai: { type: String }  
    },

    // Dark Green
    accountsDeptSubmission: {
        dateGivenToAccounts: { type: Date },  
        nameGivenByPIMO: { type: String }  
    },

    // Orange
    date_record_in_accounts_dept:{type: Date},

    // Red
    date_returned_back_to_pimo: {type: Date},

    // White
    inv_given_for_booking_and_checking: {type: String},

    // Mint
    date_returned_back_in_accounts_dept: {type: Date},

    // Light Green
    paymentInstructions: {
        instructions: { type: String }, 
        remarks: { type: String }  
    },

    // Light Blue
    accountsPaymentDetails: {
        f110Identification: { type: String },  
        paymentDate: { type: Date }, 
        accountsIdentification: { type: String },  
        paymentAmount: { type: Number }, 
        remarks: { type: String }  
    },

    //White
    status: {type: String, enum: ["paid", "unpaid"]},

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
            "Others"
        ],
        required: true
    },
},{timestamps:true});

const Bill = mongoose.model('Bill', billSchema);

export const getBillFields = () => {
    return Object.keys(Bill.schema.paths).filter(field => field !== "__v" && field !== "_id" && field !== "createdAt" && field !== "updatedAt");
};

export default Bill;
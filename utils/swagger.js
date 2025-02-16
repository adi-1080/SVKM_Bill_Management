import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SVKM Bill Management API",
      version: "1.0.0",
      description: "Automatically generated API documentation",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],
    components: {
      schemas: {
        Bill: {
          type: "object",
          required: [
            "typeOfInv",
            "projectDescription",
            "vendorNo",
            "vendorName",
            "gstNumber",
            "compliance206AB",
            "panStatus",
            "poCreated",
            "billDate",
            "vendor",
            "amount",
            "currency",
            "region",
            "natureOfWork"
          ],
          properties: {
            srNo: { type: "number" },
            typeOfInv: { type: "string" },
            projectDescription: { type: "string" },
            vendorNo: { type: "string" },
            vendorName: { type: "string" },
            gstNumber: { type: "string" },
            compliance206AB: { type: "string" },
            panStatus: { type: "string" },
            poCreated: { type: "string", enum: ["Yes", "No"] },
            poNo: { type: "string" },
            poDate: { type: "string", format: "date" },
            poAmt: { type: "number" },
            proformaInvNo: { type: "string" },
            proformaInvDate: { type: "string", format: "date" },
            billDate: { type: "string", format: "date" },
            vendor: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string", enum: ["INR", "USD", "RMB", "EURO"] },
            region: { 
              type: "string", 
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
              ]
            },
            natureOfWork: { 
              type: "string", 
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
              ]
            }
          },
          example: {
            srNo: 1,
            typeOfInv: "Proforma Invoice",
            projectDescription: "Project XYZ Description",
            vendorNo: "VN0001",
            vendorName: "ABC Vendors",
            gstNumber: "GST12345",
            compliance206AB: "Yes",
            panStatus: "Valid",
            poCreated: "Yes",
            billDate: "2023-10-10",
            vendor: "60cee48f788f8c001cf5b4b1",
            amount: 25000.50,
            currency: "INR",
            region: "MUMBAI",
            natureOfWork: "Materials"
          }
        }
      }
    }
  },
  // Loading only routes since the model is now defined in swagger options.
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;

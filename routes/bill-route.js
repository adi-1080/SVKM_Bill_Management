/**
 * @swagger
 * /bill/bills:
 *   post:
 *     summary: Create a new bill
 *     description: Create a new bill record.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bill'
 *           example:
 *             srNo: 1
 *             typeOfInv: "Proforma Invoice"
 *             projectDescription: "Project XYZ Description"
 *             vendorNo: "VN0001"
 *             vendorName: "ABC Vendors"
 *             gstNumber: "GST12345"
 *             compliance206AB: "Yes"
 *             panStatus: "Valid"
 *             poCreated: "Yes"
 *             billDate: "2023-10-10"
 *             vendor: "60cee48f788f8c001cf5b4b1"
 *             amount: 25000.50
 *             currency: "INR"
 *             region: "MUMBAI"
 *             natureOfWork: "Materials"
 *     responses:
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "64f8fbc1234abcd5678ef901"
 *               typeOfInv: "Proforma Invoice"
 *               projectDescription: "Project XYZ Description"
 *               amount: 25000.50
 *       400:
 *         description: Bad request. Validation error details.
 *         content:
 *           application/json:
 *             example:
 *               message: "Validation error message"
 *
 *   get:
 *     summary: Retrieve all bills
 *     description: Get a list of all bills.
 *     responses:
 *       200:
 *         description: List of bills retrieved successfully.
 *         content:
 *           application/json:
 *             example:
 *               - _id: "64f8fbc1234abcd5678ef901"
 *                 typeOfInv: "Proforma Invoice"
 *                 projectDescription: "Project XYZ Description"
 *                 amount: 25000.50
 *               - _id: "64f8fbc1234abcd5678ef902"
 *                 typeOfInv: "Credit note"
 *                 projectDescription: "Another project"
 *       400:
 *         description: Bad request.
 *         content:
 *           application/json:
 *             example:
 *               message: "Error message"
 *
 * /bill/filter:
 *   get:
 *     summary: Filter bills based on various criteria
 *     parameters:
 *       - in: query
 *         name: vendorName
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendorNo
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: natureOfWork
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filtered list of bills
 */
import billController from "../controllers/bill-controller.js";
import express from "express";

const router = express.Router();

router.post("/bills", billController.createBill);
router.get("/bills", billController.getBills);
router.get("/bills/:id", billController.getBill);
router.put("/bills/:id", billController.updateBill);
router.delete("/bills/:id", billController.deleteBill);
router.get("/filter", billController.filterBills);
router.get("/stats", billController.getBillsStats);

export default router;

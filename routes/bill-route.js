/**
 * @swagger
 * /bill/bills:
 *   post:
 *     summary: Create a new bill
 *     responses:
 *       201:
 *         description: Bill created successfully
 *   get:
 *     summary: Retrieve all bills
 *     responses:
 *       200:
 *         description: A list of bills
 */
import billController from "../controllers/bill-controller.js";
import express from "express";

const router = express.Router()

router.post('/bills', billController.createBill); 
router.get('/bills', billController.getBills);
router.get('/bills/:id', billController.getBill);
router.put('/bills/:id', billController.updateBill);
router.delete('/bills/:id', billController.deleteBill);

export default router;
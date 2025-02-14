import billController from "../controllers/bill-controller.js";
import express from "express";

const router = express.Router()

router.post('/bills', billController.createBill); 
router.get('/bills', billController.getBills);
router.get('/bills/:id', billController.getBill);
router.put('/bills/:id', billController.updateBill);
router.delete('/bills/:id', billController.deleteBill);

export default router;
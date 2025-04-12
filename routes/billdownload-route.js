import express from "express";
import reportController from "../controllers/billdownload-controller.js";

const router = express.Router();

router.post("/generate-report", reportController.generateReport);

// Import bills from file route
router.post("/import-report", reportController.importBills);

// New route for patching bills through Excel uploads
router.post("/patch-bills", reportController.patchBillsFromExcel);

// New route for fixing bill serial numbers
router.post("/fix-serial-numbers", reportController.fixBillSerialNumbers);

// Add a bulk fix route
router.post("/bulk-fix-serial-numbers", reportController.bulkFixSerialNumbers);

export default router;

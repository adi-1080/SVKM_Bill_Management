import express from 'express';
import masterController from '../controllers/master-controller.js';

const router = express.Router();

// Vendor Master
router.post('/vendors', masterController.createVendor);
router.get('/vendors', masterController.getVendors);
router.put('/vendors/:id', masterController.updateVendor);
router.delete('/vendors/:id', masterController.deleteVendor);

// Compliance Master
router.post('/compliances', masterController.createCompliance);
router.get('/compliances', masterController.getCompliances);
router.put('/compliances/:id', masterController.updateCompliance);
router.delete('/compliances/:id', masterController.deleteCompliance);

// User Master
router.post('/users', masterController.createUser);
router.get('/users', masterController.getUsers);
router.put('/users/:id', masterController.updateUser);
router.delete('/users/:id', masterController.deleteUser);

// PAN Status Master
router.post('/panstatus', masterController.createPanStatus);
router.get('/panstatus', masterController.getPanStatuses);
router.put('/panstatus/:id', masterController.updatePanStatus);
router.delete('/panstatus/:id', masterController.deletePanStatus);

// Region Master
router.post('/regions', masterController.createRegion);
router.get('/regions', masterController.getRegions);
router.put('/regions/:id', masterController.updateRegion);
router.delete('/regions/:id', masterController.deleteRegion);

// Nature of Work Master
router.post('/nature-of-works', masterController.createNatureOfWork);
router.get('/nature-of-works', masterController.getNatureOfWorks);
router.put('/nature-of-works/:id', masterController.updateNatureOfWork);
router.delete('/nature-of-works/:id', masterController.deleteNatureOfWork);

// Currency Master
router.post('/currencies', masterController.createCurrency);
router.get('/currencies', masterController.getCurrencies);
router.put('/currencies/:id', masterController.updateCurrency);
router.delete('/currencies/:id', masterController.deleteCurrency);

export default router;

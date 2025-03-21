import express from "express";
import roleRoute from "../controllers/role-controller.js";

const router = express.Router();

router.post("/roles", roleRoute.createRole);      
router.get("/roles", roleRoute.getRoles);        
router.get("/roles/:id", roleRoute.getRoleById);   
router.put("/roles/:id", roleRoute.updateRole);    
router.delete("/roles/:id", roleRoute.deleteRole); 
export default router;

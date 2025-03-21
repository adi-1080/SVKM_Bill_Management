import express from 'express';
import {
    createUserRole,
    getAllUserRoles,
    getUserRoleById,
    updateUserRole,
    deleteUserRole,
} from '../controllers/user-roles-controller.js';

const router = express.Router();

router.post('/', createUserRole);
router.get('/', getAllUserRoles);
router.get('/:id', getUserRoleById);
router.put('/:id', updateUserRole);
router.delete('/:id', deleteUserRole);

export default router;
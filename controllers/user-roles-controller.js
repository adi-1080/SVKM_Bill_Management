import UserRole from '../models/user-roles-model.js';
import User from '../models/user-model.js';
import Role from '../models/role-model.js';

export const createUserRole = async (req, res) => {
    const { user, role } = req.body;

    try {
        const userExists = await User.findById(user);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        const rolesExist = await Role.find({ _id: { $in: role } });
        if (rolesExist.length !== role.length) {
            return res.status(404).json({ message: "One or more roles not found" });
        }

        const existingUserRole = await UserRole.findOne({ user });
        if (existingUserRole) {
            return res.status(400).json({ message: "Roles already assigned to this user. Use update instead." });
        }

        const newUserRole = new UserRole({ user, role });
        await newUserRole.save();

        res.status(201).json({
            message: "User roles assigned successfully",
            userRole: newUserRole,
        });
    } catch (error) {
        res.status(500).json({ message: "Error assigning roles to user", error: error.message });
    }
};

export const getAllUserRoles = async (req, res) => {
    try {
        const userRoles = await UserRole.find().populate('user').populate('role');
        res.status(200).json(userRoles);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user roles", error: error.message });
    }
};

export const getUserRoleById = async (req, res) => {
    const { id } = req.params;

    try {
        const userRole = await UserRole.findById(id).populate('user').populate('role');
        if (!userRole) {
            return res.status(404).json({ message: "User role not found" });
        }
        res.status(200).json(userRole);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user role", error: error.message });
    }
};

export const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        const userRole = await UserRole.findById(id);
        if (!userRole) {
            return res.status(404).json({ message: "User role not found" });
        }

        const rolesExist = await Role.find({ _id: { $in: role } });
        if (rolesExist.length !== role.length) {
            return res.status(404).json({ message: "One or more roles not found" });
        }

        userRole.role = role;
        await userRole.save();

        res.status(200).json({
            message: "User roles updated successfully",
            userRole,
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating user roles", error: error.message });
    }
};

export const deleteUserRole = async (req, res) => {
    const { id } = req.params;

    try {
        const userRole = await UserRole.findByIdAndDelete(id);
        if (!userRole) {
            return res.status(404).json({ message: "User role not found" });
        }
        res.status(200).json({ message: "User roles deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user roles", error: error.message });
    }
};
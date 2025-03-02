import Bill from '../models/bill-model.js'; 
import UserRole from '../models/user-roles-model.js';
import {getBillFields} from '../models/bill-model.js';

const getBillSchemaFields = async (req, res) => {
    try {
        const fields = getBillFields();
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkPermissions = async (userId, action, field) => {
    const userRole = await UserRole.findOne({user: userId}).populate('role');

    if(!userRole) return false;

    for(const role of userRole.role){
        if(role.permissions[action] && role.permissions[action][field]) return true;
    }
    return false;
}
const createBill = async (req, res) => {
    try {
        const bill = new Bill(req.body);
        await bill.save();
        res.status(201).json(bill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
    
const getBills = async (req, res) => {
    try {
        const bills = await Bill.find();
        res.status(200).json(bills);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.status(200).json(bill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateBill = async (req, res) => {
    const userId = req.userId;
    const id = req.params.id; // this is the bill _id
    const updates = req.body;

    console.log("userId",userId);
    // if(!await checkPermissions(userId,'edit')){
    //     return res.status(403).json({message: 'You cannot edit these fields'})
    // }
    for (const field in updates){
        if(!await checkPermissions(userId,'edit',field)){
            return res.status(403).json({message: "You cannot edit these fields"})
        }
    }
    try {
        const bill = await Bill.findByIdAndUpdate(id, req.body, { new: true });
        console.log("bill ",bill);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.status(200).json(bill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteBill = async (req, res) => {
    try {
        const bill = await Bill.findByIdAndDelete(req.params.id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.status(200).json({ message: 'Bill deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    createBill,
    getBill,
    getBills,
    updateBill,
    deleteBill,
    getBillSchemaFields,
};
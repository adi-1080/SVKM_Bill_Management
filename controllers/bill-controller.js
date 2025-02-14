import Bill from '../models/bill-model.js'; 

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
    try {
        const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    deleteBill
};
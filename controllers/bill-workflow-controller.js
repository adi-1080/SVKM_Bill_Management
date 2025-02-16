import BillWorkflow from "../models/bill-workflow-model.js";

const createBillWorkflow = async (req, res) => {
    try {
        const workflow = new BillWorkflow(req.body);
        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getBillWorkflows = async (req, res) => {
    try {
        const workflows = await BillWorkflow.find();
        res.status(200).json(workflows);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getBillWorkflow = async (req, res) => {
    try {
        const workflow = await BillWorkflow.findById(req.params.id);
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json(workflow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateBillWorkflow = async (req, res) => {
    try {
        const workflow = await BillWorkflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json(workflow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteBillWorkflow = async (req, res) => {
    try {
        const workflow = await BillWorkflow.findByIdAndDelete(req.params.id);
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        res.status(200).json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    createBillWorkflow,
    getBillWorkflows,
    getBillWorkflow,
    updateBillWorkflow,
    deleteBillWorkflow
};

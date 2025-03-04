
import Bill from '../models/bill-model.js'; 
import UserRole from '../models/user-roles-model.js';
import {
    buildAmountRangeQuery,
    buildDateRangeQuery,
  } from "../utils/bill-helper.js";

// kuch aur try kar raha tha lekin jaane do ignore kardo
// const getBillSchemaFields = async (req, res) => {
//     try {
//         const fields = getBillFields();
//         res.status(200).json(fields);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

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
      return res.status(404).json({ message: "Bill not found" });
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

    console.log("updates",updates);
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
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const filterBills = async (req, res) => {
  try {
    const {
      vendorName,
      vendorNo,
      projectDescription,
      gstNumber,
      startDate,
      endDate,
      status,
      minAmount,
      maxAmount,
      natureOfWork,
      region,
      currency,
      poCreated,
      compliance206AB,
      panStatus,
    } = req.query;

    const query = {};

    // Text-based filters with case-insensitive partial matching
    if (vendorName) query.vendorName = { $regex: vendorName, $options: "i" };
    if (vendorNo) query.vendorNo = { $regex: vendorNo, $options: "i" };
    if (projectDescription)
      query.projectDescription = { $regex: projectDescription, $options: "i" };
    if (gstNumber) query.gstNumber = { $regex: gstNumber, $options: "i" };

    // Exact match filters
    if (status) query.status = status;
    if (natureOfWork) query.natureOfWork = natureOfWork;
    if (region) query.region = region;
    if (currency) query.currency = currency;
    if (poCreated) query.poCreated = poCreated;
    if (compliance206AB) query.compliance206AB = compliance206AB;
    if (panStatus) query.panStatus = panStatus;

    // Date range filter
    if (startDate || endDate) {
      query.billDate = buildDateRangeQuery(startDate, endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = buildAmountRangeQuery(minAmount, maxAmount);
    }

    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bills = await Bill.find(query)
      .sort({ billDate: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Bill.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bills,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error filtering bills",
      error: error.message,
    });
  }
};

const getBillsStats = async (req, res) => {
  try {
    const stats = await Bill.aggregate([
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          minAmount: { $min: "$amount" },
          maxAmount: { $max: "$amount" },
          statusCounts: {
            $push: {
              k: "$status",
              v: 1,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBills: 1,
          totalAmount: 1,
          avgAmount: 1,
          minAmount: 1,
          maxAmount: 1,
          statusCounts: {
            $arrayToObject: "$statusCounts",
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {},
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error getting bills statistics",
      error: error.message,
    });
  }
};

export default {

  createBill,
  getBill,
  getBills,
  updateBill,
  deleteBill,
  filterBills,
  getBillsStats,
//   getBillSchemaFields,
};

//helper functions ignore for now
// const buildDateRangeQuery = (startDate, endDate) => {
//     const dateQuery = {};
//     if (startDate) dateQuery.$gte = new Date(startDate);
//     if (endDate) dateQuery.$lte = new Date(endDate);
//     return dateQuery;
// };

// const buildAmountRangeQuery = (minAmount, maxAmount) => {
//     const amountQuery = {};
//     if (minAmount) amountQuery.$gte = Number(minAmount);
//     if (maxAmount) amountQuery.$lte = Number(maxAmount);
//     return amountQuery;
// };


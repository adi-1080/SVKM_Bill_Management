import Bill from '../models/bill-model.js';

const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
} 

export const getTotalAmountByRegion = async (req, res) => {
  try {
    const result = await Bill.aggregate([
      {
        $group: {
          _id: "$region",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTotalAmountByDate = async (req, res) => {
  try {
    const result = await Bill.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$billDate" } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonthlyBill = async (req, res) => {
  try {
    const result = await Bill.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$billDate" },
            month: { $month: "$billDate" }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          yearMonth: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" }
                ]
              }
            ]
          },
          totalAmount: 1,
          count: 1,
          _id: 0
        }
      },
      { $sort: { yearMonth: 1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTotalAmountInDateRange = async (req, res) => {
  try {
    const {start,end} = req.query;

    const result = await Bill.aggregate([
      {
        $match: {
          billDate: {
            $gte: new Date(start),
            $lte: endOfDay(end),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
    res.json(result[0] || { totalAmount: 0, count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAmountByRegionInDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    const result = await Bill.aggregate([
      {
        $match: {
          billDate: {
            $gte: new Date(start),
            $lte: endOfDay(end),
          },
        },
      },
      {
        $group: {
          _id: "$region",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const natureOfWork = async (req, res) => {
  try {
    const result = await Bill.aggregate([
      {
        $lookup: {
          from: "natureofworkmasters",
          localField: "natureOfWork",
          foreignField: "_id",
          as: "natureOfWork"
        }
      },
      { $unwind: "$natureOfWork" },
      {
        $group: {
          _id: "$natureOfWork.natureOfWork",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const compliance = async (req, res) => {
  try {
    const result = await Bill.aggregate([
      {
        $lookup: {
          from: "compliancemasters",
          localField: "compliance206AB",
          foreignField: "_id",
          as: "compliance"
        }
      },
      { $unwind: "$compliance" },
      {
        $group: {
          _id: "$compliance.compliance206AB",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const natureOfWorkDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    const result = await Bill.aggregate([
      {
        $match: {
          billDate: {
            $gte: new Date(start),
            $lte: endOfDay(new Date(end))
          },
          amount: { $ne: null }
        }
      },
      {
        $lookup: {
          from: "natureofworkmasters",
          localField: "natureOfWork",
          foreignField: "_id",
          as: "natureOfWork"
        }
      },
      { $unwind: "$natureOfWork" },
      {
        $group: {
          _id: "$natureOfWork.natureOfWork",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const complianceDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;

    const result = await Bill.aggregate([
      {
        $match: {
          billDate: {
            $gte: new Date(start),
            $lte: endOfDay(new Date(end))
          },
          amount: { $ne: null }
        }
      },
      {
        $lookup: {
          from: "compliancemasters",
          localField: "compliance206AB",
          foreignField: "_id",
          as: "compliance"
        }
      },
      { $unwind: "$compliance" },
      {
        $group: {
          _id: "$compliance.compliance206AB",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

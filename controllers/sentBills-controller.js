import Bill from "../models/bill-model.js";

// Map roles to workflow levels
const roleLevelMap = {
  site_officer: 1,
  quality_inspector: 1,
  quantity_surveyor: 1,
  architect: 1,
  site_engineer: 1,
  site_incharge: 1,
  trustees: 1,
  fi: 3,
  it_office_mumbai: 3,
  pimo_mumbai: 2,
  qs_mumbai: 3,
  accounts_department: 7,
  // Add other roles and their levels as needed
};

// GET /api/workflow/above-level/:role
export const getBillsAboveLevel = async (req, res) => {
  try {
    const { role } = req.params;
    const level = roleLevelMap[role];
    if (level === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }
    const bills = await Bill.find({ currentCount: { $gt: level } });
    return res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error) {
    console.error("Error fetching bills above level:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bills above level",
      error: error.message,
    });
  }
};

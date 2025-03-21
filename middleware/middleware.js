import jwt from 'jsonwebtoken';
import User from '../models/user-model.js';
import Bill from '../models/bill-model.js';

// Role to state permission mapping

//basic jwt middleware
export const authMiddleware = (req, res, next) => {
  try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "No token provided" });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
  } catch (error) {
      res.status(401).json({ message: "Unauthorized access" });
  }
};



const statePermissions = {
  // Map of states and which roles can take action on them
  "Site_Officer": ["site_officer", "admin"],
  "Site_PIMO": ["site_pimo", "admin"],
  "QS_Site": ["qs_site", "admin"],
  "PIMO_Mumbai": ["pimo_mumbai", "admin"],
  "Directors": ["director", "admin"],
  "Accounts": ["accounts", "admin"],
  "Completed": ["admin"],
  "Rejected": ["admin"]
};

// Map roles to permissions for advancing from one state to the next
const advancePermissions = {
  "site_officer": ["Site_Officer"],
  "site_pimo": ["Site_PIMO"],
  "qs_site": ["QS_Site"],
  "pimo_mumbai": ["PIMO_Mumbai"],
  "director": ["Directors"],
  "accounts": ["Accounts"],
  "admin": ["Site_Officer", "Site_PIMO", "QS_Site", "PIMO_Mumbai", "Directors", "Accounts"]
};

// Map roles to permissions for reverting from one state to previous
const revertPermissions = {
  "site_officer": [],
  "site_pimo": ["QS_Site"],
  "qs_site": ["PIMO_Mumbai"],
  "pimo_mumbai": ["Directors"],
  "director": ["Accounts"],
  "accounts": ["Completed"],
  "admin": ["Site_PIMO", "QS_Site", "PIMO_Mumbai", "Directors", "Accounts", "Completed"]
};

// Authentication middleware
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For testing purposes, if no token, create a basic user object
      // In production, this should be removed and proper auth enforced
      if (process.env.NODE_ENV === 'development') {
        req.user = { name: 'Test User', role: 'admin' };
        return next();
      }
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    req.user = decoded;
    next();
  } catch (error) {
    // For testing purposes, if token verification fails, create a basic user object
    if (process.env.NODE_ENV === 'development') {
      req.user = { name: 'Test User', role: 'admin' };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: `User with role '${req.user.role}' not authorized for this action`
      });
    }

    next();
  };
};

// Workflow validation middleware
export const validateWorkflowTransition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const action = req.path.split('/').pop(); // Get the action from URL (advance, revert, reject, recover)
    
    // Skip detailed validation for development/testing
    if (process.env.NODE_ENV === 'development' && req.user.role === 'admin') {
      return next();
    }
    
    // Get the bill
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    const currentState = bill.workflowState.currentState;
    const userRole = req.user.role;
    
    // Define role-state mappings (which roles can act on which states)
    const stateRoleMap = {
      'Site_Officer': ['site_officer', 'admin'],
      'Site_PIMO': ['site_pimo', 'admin'],
      'QS_Site': ['qs_site', 'admin'],
      'PIMO_Mumbai': ['pimo_mumbai', 'admin'],
      'Directors': ['director', 'admin'],
      'Accounts': ['accounts', 'admin'],
      'Completed': ['admin'],
      'Rejected': ['admin', 'site_officer', 'site_pimo', 'qs_site', 'pimo_mumbai', 'director', 'accounts'] // Any role can recover a rejected bill
    };
    
    // Check if user can act on the current state
    if (!stateRoleMap[currentState]?.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `User with role '${userRole}' cannot ${action} bills from state '${currentState}'`
      });
    }
    
    // Special handling for recover action
    if (action === 'recover') {
      const { targetState } = req.body;
      
      if (!targetState) {
        return res.status(400).json({
          success: false,
          message: 'Target state is required for recovery'
        });
      }
      
      // Determine if user can recover to the target state
      // For simplicity, we're allowing recovery to any state previous to the rejecting state
      // or directly to the state that did the rejection
      
      // Find the last state before rejection
      let lastActiveState = null;
      
      if (bill.workflowState.history && bill.workflowState.history.length > 0) {
        // Find the state that did the rejection - go back until we find a non-rejected state
        for (let i = bill.workflowState.history.length - 1; i >= 0; i--) {
          if (bill.workflowState.history[i].state !== 'Rejected') {
            lastActiveState = bill.workflowState.history[i].state;
            break;
          }
        }
      }
      
      // Default to Site_Officer if no history found
      lastActiveState = lastActiveState || 'Site_Officer';
      
      // For Role-based recovery restrictions:
      // 1. Admin can recover to any state
      // 2. Each role can only recover to its own state or previous states
      
      const stateOrder = ["Site_Officer", "Site_PIMO", "QS_Site", "PIMO_Mumbai", "Directors", "Accounts", "Completed"];
      const roleMaxStateIndex = {
        'site_officer': 0,
        'site_pimo': 1,
        'qs_site': 2,
        'pimo_mumbai': 3,
        'director': 4,
        'accounts': 5,
        'admin': 6
      };
      
      const targetStateIndex = stateOrder.indexOf(targetState);
      const userMaxStateIndex = roleMaxStateIndex[userRole];
      
      if (targetStateIndex === -1) {
        return res.status(400).json({
          success: false,
          message: `Invalid target state: ${targetState}`
        });
      }
      
      if (userRole !== 'admin' && targetStateIndex > userMaxStateIndex) {
        return res.status(403).json({
          success: false,
          message: `User with role '${userRole}' cannot recover bill to state '${targetState}'`
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Workflow validation error:', error);
    res.status(500).json({ success: false, message: 'Error validating workflow transition', error: error.message });
  }
};

// Validate state access middleware
export const validateStateAccess = (req, res, next) => {
  const { state } = req.params;
  const userRole = req.user.role;
  
  // Define which roles can see which states
  const stateAccessMap = {
    'site_officer': ['Site_Officer'],
    'site_pimo': ['Site_Officer', 'Site_PIMO'],
    'qs_site': ['Site_PIMO', 'QS_Site'],
    'pimo_mumbai': ['QS_Site', 'PIMO_Mumbai'],
    'director': ['PIMO_Mumbai', 'Directors'],
    'accounts': ['Directors', 'Accounts', 'Completed'],
    'admin': ['Site_Officer', 'Site_PIMO', 'QS_Site', 'PIMO_Mumbai', 'Directors', 'Accounts', 'Completed', 'Rejected']
  };
  
  // Admin can access all states
  if (userRole === 'admin') {
    return next();
  }
  
  // Check if the user can access the requested state
  if (!stateAccessMap[userRole]?.includes(state)) {
    return res.status(403).json({
      success: false,
      message: `User with role '${userRole}' cannot access bills in state '${state}'`
    });
  }
  
  next();
}; 
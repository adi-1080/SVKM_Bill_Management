import jwt from "jsonwebtoken";
import UserRole from "../models/user-roles-model.js";

//basic jwt middleware // used this for authenticating UserRole model
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userRole = await UserRole.findOne({user: decoded.userId}).populate('role');
        if(!userRole){
            return res.status(403).json({message: "User Role not found, im inside middleware"});
        }
        req.userRole = userRole;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized access" });
    }
};

export default authMiddleware;

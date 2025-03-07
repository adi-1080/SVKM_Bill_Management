import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user-model.js";

//I think ye dekhna padega as signup me unko kitni fields chahiye.
const signup = async (req, res) => {
    try {
        console.log('Signup')
        const { name, email, password, role } = req.body;
        console.log(req.body);

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const signin = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email, role });
        if (!user) return res.status(400).json({ message: "User not found or invalid role" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email, 
                name: user.name, 
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            {
                expiresIn: "8h"
            }
        );
        res.status(200).json({ token });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default { signup, signin };

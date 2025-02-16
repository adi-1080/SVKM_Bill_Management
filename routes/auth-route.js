/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Signup a new user
 *     description: Register a new user with required credentials.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *             example:
 *               name: "John Doe"
 *               email: "john@example.com"
 *               password: "securePass123"
 *               role: "Accounts Team"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "User created successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             example:
 *               message: "User already exists"
 *
 * /auth/signin:
 *   post:
 *     summary: Signin an existing user
 *     description: Authenticate a user and return a JWT that expires in 8h.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               email: "john@example.com"
 *               password: "securePass123"
 *     responses:
 *       200:
 *         description: User signed in successfully
 *         content:
 *           application/json:
 *             example:
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid credentials"
 */
import express from "express";
import authController from "../controllers/auth-controller.js";

const router = express.Router();

// signup and signin routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

export default router;

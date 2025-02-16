/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Signup a new user
 *     description: Register a new user with required credentials.
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *
 * /auth/signin:
 *   post:
 *     summary: Signin an existing user
 *     description: Authenticate user and return a JWT that expires in 8h.
 *     responses:
 *       200:
 *         description: User signed in successfully
 *       400:
 *         description: Invalid credentials
 */
import express from "express";
import authController from "../controllers/auth-controller.js";

const router = express.Router();

//singup signin routes
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

export default router;

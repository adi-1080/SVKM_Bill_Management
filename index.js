import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./utils/db.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger.js";

const app = express();
const port = process.env.PORT || 5000;
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"]
  })
);

import billRoute from "./routes/bill-route.js";
import userRoute from "./routes/user-route.js";
import vendorRoute from "./routes/vendor-route.js";
import billWorkflowRoute from "./routes/bill-workflow-route.js";
import roleRoute from "./routes/role-route.js";
import userRoleRoute from "./routes/user-roles-route.js";

app.use('/bill', billRoute);
app.use('/users', userRoute);
app.use('/vendors', vendorRoute);
app.use('/bwf', billWorkflowRoute);
app.use('/role', roleRoute);
app.use('/user-roles', userRoleRoute);

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});

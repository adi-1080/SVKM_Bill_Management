import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./utils/db.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger.js";

const app = express();
const port = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));


import billRoute from "./routes/bill-route.js";
import userRoute from "./routes/user-route.js";
import vendorRoute from "./routes/vendor-route.js";
import statRoute from "./routes/stat-routes.js";
import reportRoute from "./routes/billdownload-route.js";
import authRoute from "./routes/auth-route.js";
import roleRoute from "./routes/role-route.js";
import reportRoutes from "./routes/report-route.js";

app.use('/auth', authRoute);
app.use('/bill', billRoute);
app.use('/users', userRoute);
app.use('/vendors', vendorRoute);
app.use('/stats', statRoute);
app.use('/report',reportRoute);
app.use('/role', roleRoute);
app.use('/api/reports', reportRoutes);


// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

export default app;

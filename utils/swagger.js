import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SVKM Bill Management API",
      version: "1.0.0",
      description: "Automatically generated API documentation",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],
  },
  // Paths to files containing JSDoc comments for endpoints.
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;

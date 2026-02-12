import express from "express";
import authRoutes from "./routes/authentication";
import setupRoutes from "./routes/setup";
import appointmentRoutes from "./routes/appointments";
import customerRoutes from "./routes/customers";
import cors from "cors";

const app = express();
const port = 4000;

app.use(cors( {
  origin: [
    "http://localhost:5173",
    "http://192.168.0.20:5173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());


// --------------- TEST ROOT ROUTE ---------------
app.get("/", (req, res) => {
  res.send("Server is alive ");
});
// -----------------------------------------------

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api", setupRoutes); 
app.use("/api", appointmentRoutes);
app.use("/api", customerRoutes);






app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

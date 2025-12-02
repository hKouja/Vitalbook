import express from "express";
import authRoutes from "./routes/authentication";
import setupRoutes from "./routes/setup";
import appointmentRoutes from "./routes/appointments";
import customerRoutes from "./routes/customers";
import cors from "cors";


const app = express();
const port = 4000;

app.use(cors());
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






app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Register new staff user
router.post("/register", async (req, res) => {
   const { email, full_name, password } = req.body;
   try {
      //check if already exists
      const existing = await pool.query("SELECT * FROM staff_users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
         return res.status(400).json({ error: "Email already registered" });
      }

      //Hash password
      const password_hash = await bcrypt.hash(password, 10);
      
      // insert user
      const result = await pool.query(
         "INSERT INTO staff_users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, full_name",
         [email, full_name, password_hash]
      );

      res.status(201).json({message: "User registered succesffully", user: result.rows[0] });
   
   } catch (err) {
         console.error(err);
         res.status(500).json({ error: "Registration failed" });
   }

});

//Login
router.post("/login", async (req, res) => {
   const { email, password } = req.body;
   try {
      //Find user
      const result = await pool.query("SELECT * FROM staff_users WHERE email = $1", [email])
      if (result.rows.length === 0) {
         return res.status(400).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];

      //compare password
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
         return res.status(400).json({ error: "Invalid email or password" });
      }

      // create JWT token
      const token = jwt.sign(
         { id: result.rows[0].id, email },
         process.env.JWT_SECRET || "supersecret",
         { expiresIn: "7d" }
      );
      res.json({
         token,
         full_name: result.rows[0].full_name,
         email: result.rows[0].email,
      });

   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed" });
   }
});

//checking routes boys
router.get("/", (req, res) => {
  res.send("Auth routes working!");
});
router.get("/register", (req, res) => {
  res.send("register routes working!");
});
router.get("/login", (req, res) => {
  res.send("login routes working!");
});


export default router;
import express from "express";
import pool from "../db";
import { requireAuth } from "../middleware/auth";
// import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

// Get all customers
router.get("/customers", requireAuth, async (req, res) => {
   try {
      const created_by = req.user!.id;
      const result = await pool.query(
         `SELECT * FROM customers
         WHERE created_by = $1
         ORDER BY created_at DESC`,
         [created_by]
      );
      res.json(result.rows);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch customers" });
   }
});

//Get customer by ID
router.get("/customers/:id", requireAuth, async (req, res) => {
   try {
      const created_by = req.user!.id;
      const { id } = req.params;
      const result = await pool.query("SELECT * FROM customers WHERE id = $1", [id, created_by]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Customer not found" });
      res.json(result.rows[0]);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch customer" });
   }
});

// add a new customer POST
router.post("/customers", requireAuth, async (req, res) => {
   try {
      const { full_name, phone_number, security_number, color } = req.body;

      if (!full_name || !phone_number) {
         return res.status(400).json({ error: "Missing required fields" });
      }

      const created_by = req.user!.id;

      const result = await pool.query(
         `INSERT INTO customers (full_name, phone_number, security_number, color, created_by)
         VALUES ($1, $2, $3, COALESCE($4, '#3b82f6'), $5)
         RETURNING *`,
         [
         full_name,
         phone_number,
         security_number?.trim() ? security_number : null,
         color,
         created_by,
         ]
    );

      res.status(201).json(result.rows[0]);
   } catch (err) {
      console.error("Failed to create customer:", err);
      res.status(500).json({ error: "Failed to create customer" });
   }
});

// update customer
router.post("/customers", requireAuth, async (req, res) => {
   try {
      const { full_name, phone_number, security_number, color } = req.body;

      if (!full_name || !phone_number) {
         return res.status(400).json({ error: "Missing required fields" });
      }

      const created_by = req.user!.id;

      const result = await pool.query(
         `INSERT INTO customers (full_name, phone_number, security_number, color)
          VALUES ($1, $2, $3, COALESCE($4, '#3b82f6'))
          RETURNING *`,
         [
            full_name,
            phone_number,
            security_number && security_number.trim() !== "" ? security_number : null,
            color,
            created_by,
         ]
      );

      res.status(201).json(result.rows[0]);
   } catch (err) {
      console.error("Failed to create customer:", err);
      res.status(500).json({ error: "Failed to create customer" });
   }
});


//Delete customer
router.delete("/customers/:id", requireAuth, async (req, res) => {
   try {
      const created_by = req.user!.id;
      const { id } = req.params;
      const result = await pool.query("DELETE FROM customers WHERE id = $1 RETURNING *", [id, created_by]);

      if (result.rows.length === 0) return res.status(404).json({ error: "Customer not found" });

      res.json({ message: "Customer deleted successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete customer" });
   }
});

export default router;

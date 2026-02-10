import express from "express";
import pool from "../db";
// import authMiddleware from "../middleware/authMiddleware";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Get appointments
router.get("/appointments", requireAuth, async (req, res) => {
   try {
      const created_by = req.user!.id;

      const result = await pool.query(
         `SELECT * FROM appointments
          WHERE created_by = $1
          ORDER BY start_time ASC`,
         [created_by]
      );
      res.json(result.rows);
   } catch(err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch appointments" });
   }
});

// Post appointment
router.post("/appointments", requireAuth, async (req, res) => {
   try {
      const { customer_id, start_time, end_time, notes } = req.body;

      if (!customer_id || !start_time || !end_time) {
         return res.status(400).json({ error: "Missing required fields" });
      }
      const created_by = req.user!.id;
      const result = await pool.query(
         `INSERT INTO appointments (customer_id, start_time, end_time, notes, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
         [customer_id, start_time, end_time, notes || "", created_by]
      );
      res.status(201).json(result.rows[0]);
   } catch(err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create appointment" });
   }
});

// UPDATE appointment
router.put("/appointments/:id", requireAuth, async (req, res) => {
   try {
      const { id } = req.params;
      const { customer_id, start_time, end_time, notes } = req.body;
      const created_by = req.user!.id;

      // Ensure the appointment exists
      const existing = await pool.query(
         "SELECT * FROM appointments WHERE id = $1 AND created_by = $2", 
         [id, created_by]);
      if (existing.rows.length === 0) {
         return res.status(404).json({ error: "Appointment not found" });
      }

      const result = await pool.query(
         `UPDATE appointments
         SET
            customer_id = COALESCE($1, customer_id),
             start_time = COALESCE($2, start_time),
            end_time = COALESCE($3, end_time),
            notes = COALESCE($4, notes)
         WHERE id = $5 AND created_by = $6
         RETURNING *`,
         [customer_id, start_time, end_time, notes, id, created_by]
      );

      res.json(result.rows[0]);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update appointment" });
   }
});

// DELETE appointment
router.delete("/appointments/:id", requireAuth, async (req, res) => {
   try {
      const { id } = req.params;
      const created_by = req.user!.id;

      const result = await pool.query("DELETE FROM appointments WHERE id = $1 AND created_by = $2 RETURNING *",
         [id, created_by]);

      if (result.rows.length === 0) {
         return res.status(404).json({ error: "Appointment not found" });
      }

      res.json({ message: "Appointment deleted successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete appointment" });
   }
});

router.get("/appointments-with-customers", requireAuth, async (req, res) => {
   try {
      const { start, end } = req.query;
      const created_by = req.user!.id;

      const result = await pool.query(
         `SELECT a.*, c.full_name, c.color, c.phone_number 
          FROM appointments a
          JOIN customers c ON a.customer_id = c.id
          WHERE a.created_by = $1
            AND a.start_time >= $2 AND a.start_time <= $3
          ORDER BY a.start_time`,
         [created_by, start, end]
      );

      res.json(result.rows);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load calendar appointments" });
   }
});

// GET appointments for a week
router.get("/appointments/week", requireAuth, async (req, res) => {
   try {
      const { start, end } = req.query;
      const created_by = req.user!.id;

      const result = await pool.query(
         `SELECT * FROM appointments
          WHERE created_by = $1
            AND start_time BETWEEN $2 AND $3
          ORDER BY start_time`,
         [created_by, start, end]
      );

      res.json(result.rows);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load appointments" });
   }
});



export default router;
import express from "express";
import pool from "../db";

const router = express.Router();

//Route to initialize the database
router.get("/setup-db", async (req, res) => {
   try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

      await pool.query(`
         CREATE TABLE IF NOT EXISTS staff_users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text UNIQUE NOT NULL,
            full_name text NOT NULL,
            password_hash text NOT NULL,
            created_at timestamptz DEFAULT now()
         );
      `);

      await pool.query(`
         DROP TABLE IF EXISTS customers;
         CREATE TABLE IF NOT EXISTS customers (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name text NOT NULL,
            phone_number text NOT NULL,
            security_number text DEFAULT NULL,
            color text DEFAULT '#3b82f6',
            created_at timestamptz DEFAULT now(),
            created_by uuid REFERENCES staff_users(id)
         );
       `);

      await pool.query(`
         CREATE TABLE IF NOT EXISTS appointments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            start_time timestamptz NOT NULL,
            end_time timestamptz NOT NULL,
            notes text DEFAULT '',
            sms_sent boolean DEFAULT false,
            reminder_sent boolean DEFAULT false,
            created_by uuid REFERENCES staff_users(id),
            created_at timestamptz DEFAULT now()
         );
      `);
      
      await pool.query(`
         CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
         CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
         CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);

         ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
         ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
         ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
      `);


      res.json({ message: "Database tables created successfully!" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database setup failed" });
   }
});

export default router;
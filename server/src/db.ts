import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  password: "NewStrongPass123!", //new password
  host: "localhost",
  port: 5432,
  database: "vitalbookdb",
});

export default pool;

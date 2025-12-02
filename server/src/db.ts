import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  password: "Hassekoja1.",
  host: "localhost",
  port: 5432,
  database: "vitalbookdb",
});

export default pool;

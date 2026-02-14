import { useState } from "react";
import { login } from "../api/auth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../css/login.css";

export default function Login() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

   const navigate = useNavigate();

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setMessage(null);

      if (!email.trim() || !password.trim()) {
         setMessage({ type: "error", text: "Please enter email and password." });
         return;
      }

      setLoading(true);

      try {
         const data = await login(email.trim(), password);
         localStorage.setItem("token", data.token);
         localStorage.setItem("email", data.email);
         localStorage.setItem("full_name", data.full_name);

         setMessage({ type: "ok", text: `Logged in as ${data.full_name}` });
         navigate("/dashboard");
      } catch {
         setMessage({ type: "error", text: "Invalid email or password" });
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="vb-auth vb-login">
         <div className="vb-auth-card">
            <header className="vb-auth-head">
               <h1 className="vb-auth-title">Welcome back</h1>
               <p className="vb-auth-subtitle">Log in to continue to Vitalbook.</p>
            </header>

            <form onSubmit={handleSubmit} className="vb-auth-form">
               <label className="vb-field">
                  <span className="vb-label">Email</span>
                  <input
                     className="vb-input"
                     type="email"
                     autoComplete="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="john@clinic.com"
                  />
               </label>

               <label className="vb-field">
                  <span className="vb-label">Password</span>
                  <input
                     className="vb-input"
                     type="password"
                     autoComplete="current-password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                  />
               </label>

               {message && (
                  <div className={`vb-alert ${message.type === "ok" ? "vb-alert-ok" : "vb-alert-error"}`}>
                     {message.text}
                  </div>
               )}

               <div className="vb-auth-actions">
                  <button className="vb-btn vb-btn-primary" type="submit" disabled={loading}>
                     {loading ? "Logging in..." : "Login"}
                  </button>
               </div>

               <p className="vb-auth-footer">
                  Don’t have an account?{" "}
                  <Link to="/register" className="vb-link">
                     Register
                  </Link>
               </p>
            </form>
         </div>
      </div>
   );
}

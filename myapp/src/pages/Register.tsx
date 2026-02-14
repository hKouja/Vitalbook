import { useState } from "react";
import { register } from "../api/auth";
import { Link, Navigate, useNavigate } from "react-router-dom";

import "../css/register.css";


export default function Register() {
   const navigate = useNavigate();

   const [full_name, setFullName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      if (!full_name.trim() || !email.trim() || !password.trim()) {
         setMessage({ type: "error", text: "Please fill in all fields." });
         return;
      }

      setLoading(true);

      try {
         const data = await register(full_name.trim(), email.trim(), password);
         setMessage({ type: "ok", text: `Registered as ${data.user.full_name}` });
         navigate("/");
      } catch (err: any) {
         const text =
            err?.message ||
            err?.response?.data?.error ||
            "Registration failed. Please try again.";
         setMessage({ type: "error", text });
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="vb-auth">
         <div className="vb-auth-card">
            <header className="vb-auth-head">
               <h1 className="vb-auth-title">Create your account</h1>
               <p className="vb-auth-subtitle">Start managing customers and appointments in Vitalbook.</p>
            </header>

            <form onSubmit={handleSubmit} className="vb-auth-form">
               <label className="vb-field">
                  <span className="vb-label">Full name</span>
                  <input
                     className="vb-input"
                     type="text"
                     autoComplete="name"
                     value={full_name}
                     onChange={(e) => setFullName(e.target.value)}
                     placeholder="John Smith"
                  />
               </label>

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
                     autoComplete="new-password"
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
                     {loading ? "Creating..." : "Create account"}
                  </button>
               </div>

               <p className="vb-auth-footer">
                  Already have an account?{" "}
                  <Link to="/" className="vb-link">
                     Login
                  </Link>
               </p>
            </form>
         </div>
      </div>
   );

}

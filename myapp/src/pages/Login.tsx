import { useState } from "react";
import { login } from "../api/auth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Login() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [message, setMessage] = useState("");
   const navigate = useNavigate();

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      try {
         const data = await login(email, password);
         localStorage.setItem("token", data.token);
         localStorage.setItem("email", data.email);
         localStorage.setItem("full_name", data.full_name);
         setMessage(`Logged in as ${data.full_name}`);
         navigate("/dashboard");
      } catch {
         setMessage("Invalid email or password");
      }
   }

   return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
         <h1>Vitalbook</h1>
         <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md w-96">
            <h2 className="text-2xl font-semibold mb-4 text-center">Login</h2>
            <input
               type="email"
               placeholder="Email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               className="w-full border p-2 rounded mb-3"
            />
            <input
               type="password"
               placeholder="Password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="w-full border p-2 rounded mb-4"
            />
            <button
               type="submit"
               className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
               Login
            </button>
            
            {message && <p className="mt-3 text-center">{message}</p>}
            <p className="text-center mt-4 text-gray-600">
               Don’t have an account?{" "}
               <Link to="/register" className="text-blue-600 hover:underline">
                  <button>Register</button>
                  
               </Link>
            </p>
         </form>
      </div>
   );
}

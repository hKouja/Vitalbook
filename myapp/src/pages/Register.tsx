import { useState } from "react";
import { register } from "../api/auth";
import { Link } from "react-router-dom";

export default function Register() {
   const [full_name, setFullName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [message, setMessage] = useState("");

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      try {
         const data = await register(full_name, email, password);
         setMessage(`Registered as ${data.user.full_name}`);
      } catch {
         setMessage("Registration failed");
      }
   }

   return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
         <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md w-96">
            <h2 className="text-2xl font-semibold mb-4 text-center">Register</h2>
            <input
               type="text"
               placeholder="Full name"
               value={full_name}
               onChange={(e) => setFullName(e.target.value)}
               className="w-full border p-2 rounded mb-3"
            />
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
               className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
               Register
            </button>
            <p className="text-center mt-4 text-gray-600">
               already have an account{" "}
               <Link to="/" className="text-blue-600 hover:underline">
                  <button>Login</button>
                  
               </Link>
            </p>
            {message && <p className="mt-3 text-center">{message}</p>}
         </form>
      </div>
   );

}

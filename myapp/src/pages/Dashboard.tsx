import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

interface Appointment {
   id: string;
   start_time: string;
   end_time: string;
}

interface Customer {
   id: string;
   full_name: string;
}

export default function Dashboard() {
   const navigate = useNavigate();
   //const [userEmail, setUserEmail] = useState("");
   const [fullName, setFullName] = useState("");
   const [appointmentsToday, setAppointmentsToday] = useState(0);
   const [totalCustomers, setTotalCustomers] = useState(0);


   useEffect(() => {
      const token = localStorage.getItem("token");
      //const email = localStorage.getItem("email");
      const name = localStorage.getItem("full_name");

      // If no token, redirect to login
      if (!token) {
         navigate("/");
         return;
      }
      setFullName(name || "Unknown user");
      //setUserEmail(email || "");

      // Fetch customers
      fetch("http://localhost:4000/api/customers", {
         headers: { Authorization: `Bearer ${token}` },
      })
         .then((res) => res.json())
         .then((data: Customer[]) => setTotalCustomers(data.length))
         .catch((err) => console.error("Customers fetch error:", err));

      // Fetch appointments
      fetch("http://localhost:4000/api/appointments", {
         headers: { Authorization: `Bearer ${token}` },
      })
         .then((res) => res.json())
         .then((data: Appointment[]) => {
            const today = new Date().toISOString().slice(0, 10);
            const todayAppointments = data.filter((a) =>
               a.start_time.startsWith(today)
            );
            setAppointmentsToday(todayAppointments.length);
         })
         .catch((err) => console.error("Appointments fetch error:", err));
   }, [navigate]);

   function handleLogout() {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      localStorage.removeItem("full_name");
      navigate("/");
   }
   

   return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
         <div className="bg-white shadow-md rounded-xl p-6 w-96 text-center">
            <h2 className="text-2xl font-semibold mb-3">Dashboard</h2>
            <p className="mb-4 text-gray-600">Welcome, {fullName}</p>
            <p>Appointments today: {appointmentsToday}</p>
            <p>Total customers: {totalCustomers}</p>

            <button
               onClick={handleLogout}
               className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
               Logout
            </button>
            <Link to="/appointments" className="text-blue-600 hover:underline">
               <button>Appointments</button>
            </Link>
            <Link to="/customers" className="text-blue-600 hover:underline">
               <button>Customer</button>
            </Link>
            <Link to="/calendar">
               <button className="btn-primary">Calendar</button>
            </Link>

         </div>
      </div>
   );
}

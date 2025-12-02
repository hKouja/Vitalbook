import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


interface Appointment {
   id: string;
   customer_id: string;
   start_time: string;
   end_time: string;
   notes: string;
}

interface Customer {
   id: string;
   full_name: string;
}

const API_URL = "http://localhost:4000/api";

export default function Appointments() {
   const navigate = useNavigate();

   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [customerId, setCustomerId] = useState("");
   const [startTime, setStartTime] = useState("");
   const [endTime, setEndTime] = useState("");
   const [notes, setNotes] = useState("");
   

   // Fetch customers & appointments
   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
         console.log("NO TOKEN → navigating to /");
         navigate("/");
         return;
      }
      console.log("TOKEN OK → staying on page");

      // Load customers
      fetch(`${API_URL}/customers`)
         .then((res) => res.json())
         .then(setCustomers)
         .catch((err) => console.error("Error loading customers:", err));

      // Load appointments
      fetch(`${API_URL}/appointments`)
         .then((res) => res.json())
         .then(setAppointments)
         .catch((err) => console.error("Error loading appointments:", err));
   }, [navigate]);

   // Add appointment
   async function handleAddAppointment(e: React.FormEvent) {
      e.preventDefault();

      if (!customerId || !startTime || !endTime) {
         alert("Please fill in all required fields.");
         return;
      }

      const newAppointment = {
         customer_id: customerId || null,
         start_time: startTime ? startTime + ":00" : null,
         end_time: endTime ? endTime + ":00" : null,
         notes: notes || "",
      };

      try {
         const res = await fetch(`${API_URL}/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAppointment),
         });

         if (!res.ok) throw new Error("Failed to add appointment");

         const data = await res.json();
         setAppointments([...appointments, data]);

         // Reset form
         setCustomerId("");
         setStartTime("");
         setEndTime("");
         setNotes("");
      } catch (err) {
         console.error(err);
         alert("Error adding appointment");
      }
   }

   return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
         <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-3xl">
            <h2 className="text-2xl font-semibold mb-4 text-center">
               Appointments
            </h2>

            {/* Add Appointment Form */}
            <form onSubmit={handleAddAppointment} className="mb-6 grid grid-cols-1 gap-4">
               <select
                  className="border p-2 rounded"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
               >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                     <option key={c.id} value={c.id}>
                        {c.full_name}
                     </option>
                  ))}
               </select>

               <input
                  type="datetime-local"
                  className="border p-2 rounded"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
               />
               <input
                  type="datetime-local"
                  className="border p-2 rounded"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
               />
               <input
                  type="text"
                  placeholder="Notes (optional)"
                  className="border p-2 rounded"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
               />

               <button
                  type="submit"
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
               >
                  Add Appointment
               </button>
            </form>

            {/* Appointment List */}
            <table className="w-full text-left border">
               <thead>
                  <tr className="bg-gray-200">
                     <th className="p-2 border">Customer</th>
                     <th className="p-2 border">Start</th>
                     <th className="p-2 border">End</th>
                     <th className="p-2 border">Notes</th>
                  </tr>
               </thead>
               <tbody>
                  {appointments.map((a) => {
                     const customer = customers.find((c) => c.id === a.customer_id);
                     return (
                        <tr key={a.id} className="border-t">
                           <td className="p-2 border">{customer?.full_name || "Unknown"}</td>
                           <td className="p-2 border">{new Date(a.start_time).toLocaleString()}</td>
                           <td className="p-2 border">{new Date(a.end_time).toLocaleString()}</td>
                           <td className="p-2 border">{a.notes}</td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
   );
}

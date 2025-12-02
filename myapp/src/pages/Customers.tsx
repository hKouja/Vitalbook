import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Customer {
   id: string;
   full_name: string;
   phone_number: string;
   security_number?: string;
   color: string;
   created_at: string;
}

export default function Customers() {
   const navigate = useNavigate();
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);
   const [fullName, setFullName] = useState("");
   const [phoneNumber, setPhoneNumber] = useState("");
   const [securityNumber, setSecurityNumber] = useState("");
   const [color, setColor] = useState("#3b82f6");

   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
         navigate("/");
         return;
      }

      fetch("http://localhost:4000/api/customers", {
         headers: { Authorization: `Bearer ${token}` },
      })
         .then((res) => res.json())
         .then((data) => {
            setCustomers(data);
            setLoading(false);
         })
         .catch((err) => {
            console.error("Failed to load customers:", err);
            setLoading(false);
         });
   }, [navigate]);

   // handle new customer submit
   async function handleAddCustomer(e: React.FormEvent) {
      e.preventDefault();
      const token = localStorage.getItem("token");

      try {
         const response = await fetch("http://localhost:4000/api/customers", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
               full_name: fullName,
               phone_number: phoneNumber,
               security_number: securityNumber || null,
               color: color || "#3b82f6",
            }),
         });

         if (!response.ok) throw new Error("Failed to add customer");

         const newCustomer: Customer = await response.json();
         setCustomers([...customers, newCustomer]);
         setFullName("");
         setPhoneNumber("");
         setSecurityNumber("");
         setColor("#3b82f6");
      } catch (err) {
         console.error("Add customer error:", err);
      }
   }

   if (loading) {
      return <p className="text-center mt-10">Loading customers...</p>;
   }

   

   return (
      <div className="min-h-screen bg-gray-50 p-6">
         <h1 className="text-3xl font-semibold text-center mb-6">Customers</h1>

         {/*Add Customer Form */}
         <form
            onSubmit={handleAddCustomer}
            className="max-w-4xl mx-auto bg-white p-4 mb-6 rounded-lg shadow"
         >
            <h2 className="text-xl font-medium mb-3">Add New Customer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border p-2 rounded"
                  required
               />
               <input
                  type="text"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="border p-2 rounded"
                  required
               />
               <input
                  type="text"
                  placeholder="Security Number (optional)"
                  value={securityNumber}
                  onChange={(e) => setSecurityNumber(e.target.value)}
                  className="border p-2 rounded"
               />
               <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="border p-2 rounded h-10 cursor-pointer"
               />
            </div>
            <button
               type="submit"
               className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
               Add Customer
            </button>
         </form>

         {/*Customers Table */}
         <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-4">
            {customers.length === 0 ? (
               <p className="text-gray-500 text-center">No customers found.</p>
            ) : (
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="bg-gray-100 text-left">
                        <th className="p-3 border-b">Name</th>
                        <th className="p-3 border-b">Phone</th>
                        <th className="p-3 border-b">Added</th>
                     </tr>
                  </thead>
                  <tbody>
                     {customers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                           <td className="p-3 border-b">{c.full_name}</td>
                           <td className="p-3 border-b">{c.phone_number}</td>
                           <td className="p-3 border-b">
                              {new Date(c.created_at).toLocaleDateString()}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   );
}

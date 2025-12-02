import { useState } from "react";

interface ModalProps {
   start: Date | null;
   end: Date | null;
   customers: { id: string; full_name: string }[];
   onClose: () => void;
   onSave: (data: {
      customer_id: string;
      start_time: string;
      end_time: string;
      notes: string;
   }) => void;
}

export default function AppointmentModal({
   start,
   end,
   customers,
   onClose,
   onSave
}: ModalProps) {
   if (!start || !end) return null;

   const [customerId, setCustomerId] = useState("");
   const [notes, setNotes] = useState("");

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault();

      if (!customerId) {
         alert("Choose a customer");
         return;
      }
      if (!start || !end) return;
      onSave({
         customer_id: customerId,
         start_time: start.toISOString(),
         end_time: end.toISOString(),
         notes: notes || ""
      });

      onClose();
   }

   return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
         <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-semibold mb-4">New Appointment</h2>

            <form onSubmit={handleSubmit} className="space-y-4">

               <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="border p-2 rounded w-full"
               >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                     <option key={c.id} value={c.id}>
                        {c.full_name}
                     </option>
                  ))}
               </select>

               <div>
                  <p className="text-sm text-gray-600">
                     Start: {start.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                     End: {end.toLocaleString()}
                  </p>
               </div>

               <textarea
                  placeholder="Notes (optional)"
                  className="border w-full p-2 rounded"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
               />

               <div className="flex justify-end gap-2">
                  <button
                     type="button"
                     onClick={onClose}
                     className="px-4 py-2 bg-gray-300 rounded"
                  >
                     Cancel
                  </button>

                  <button
                     type="submit"
                     className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                     Save
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

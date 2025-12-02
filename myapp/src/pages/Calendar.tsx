import React, { useState, useEffect } from "react";
import AppointmentModal from "../components/AppointmentModal";

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
   color: string;
}

const API_URL = "http://localhost:4000/api";

export default function Calendar() {
   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [currentDate, setCurrentDate] = useState(new Date());

   const [modalStart, setModalStart] = useState<Date | null>(null);
   const [modalEnd, setModalEnd] = useState<Date | null>(null);

   useEffect(() => {
      loadData();
   }, [currentDate]);

   async function loadData() {
      const week = getWeekRange(currentDate);

      const a = await fetch(
         `${API_URL}/appointments/week?start=${week.start.toISOString()}&end=${week.end.toISOString()}`
      );
      const aData = await a.json();
      setAppointments(aData);

      const c = await fetch(`${API_URL}/customers`);
      const cData = await c.json();
      setCustomers(cData);
   }

   function getWeekRange(date: Date) {
      const start = new Date(date);
      const end = new Date(date);

      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);

      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { start, end };
   }

   function changeWeek(offset: number) {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + offset * 7);
      setCurrentDate(newDate);
   }

   function handleSlotClick(start: Date, end: Date) {
      setModalStart(start);
      setModalEnd(end);
   }

   function closeModal() {
      setModalStart(null);
      setModalEnd(null);
   }

   async function handleSave(data: {
      customer_id: string;
      start_time: string;
      end_time: string;
      notes: string;
   }) {
      const res = await fetch(`${API_URL}/appointments`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(data),
      });

      if (!res.ok) {
         alert("Failed to save appointment");
         return;
      }

      await loadData();
      closeModal();
   }

   return (
      <div className="p-6">
         <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeWeek(-1)}>◀ Previous Week</button>
            <h2 className="text-xl font-semibold">
               Week of {currentDate.toDateString()}
            </h2>
            <button onClick={() => changeWeek(1)}>Next Week ▶</button>
         </div>

         <WeekGrid
            appointments={appointments}
            customers={customers}
            currentDate={currentDate}
            onSlotClick={handleSlotClick}
         />

         {modalStart && modalEnd && (
            <AppointmentModal
               start={modalStart}
               end={modalEnd}
               customers={customers}
               onClose={closeModal}
               onSave={handleSave}
            />
         )}
      </div>
   );
}

/* ---------------- WEEK GRID ---------------- */

function WeekGrid({
   appointments,
   customers,
   currentDate,
   onSlotClick,
}: {
   appointments: Appointment[];
   customers: Customer[];
   currentDate: Date;
   onSlotClick: (start: Date, end: Date) => void;
}) {
   const weekDays = getWeekDays(currentDate);
   const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00–20:00

   function getWeekDays(date: Date) {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      return Array.from({ length: 7 }, (_, i) => {
         const d = new Date(start);
         d.setDate(start.getDate() + i);
         return d;
      });
   }

   function getAppointmentsForSlot(day: Date, hour: number) {
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      return appointments.filter((apt) => {
         const aptStart = new Date(apt.start_time);
         return (
            aptStart >= slotStart &&
            aptStart < slotEnd &&
            aptStart.toDateString() === day.toDateString()
         );
      });
   }

   return (
      <div
         className="border rounded bg-white overflow-hidden"
         style={{ height: "calc(100vh - 150px)" }}
      >
         <div
            className="grid text-sm"
            style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}
         >
            {/* header row */}
            <div className="bg-gray-100 border-b border-r" />
            {weekDays.map((day) => (
               <div
                  key={day.toISOString()}
                  className="bg-gray-100 border-b border-r p-2 text-center font-semibold"
               >
                  {day.toLocaleDateString("en-US", {
                     weekday: "short",
                     month: "short",
                     day: "numeric",
                  })}
               </div>
            ))}

            {/* hour rows */}
            {hours.map((hour) => (
               <React.Fragment key={hour}>
                  {/* hour label column */}
                  <div className="border-t border-r bg-gray-50 p-2 text-right text-xs font-medium">
                     {hour}:00
                  </div>

                  {/* day columns for this hour */}
                  {weekDays.map((day) => {
                     const slotApts = getAppointmentsForSlot(day, hour);

                     const startSlot = new Date(day);
                     startSlot.setHours(hour, 0, 0, 0);
                     const endSlot = new Date(startSlot);
                     endSlot.setHours(hour + 1, 0, 0, 0);

                     return (
                        <div
                           key={day.toISOString() + hour}
                           className="border-t border-r h-16 p-1 text-xs align-top cursor-pointer hover:bg-gray-50"
                           onClick={() => {
                              if (slotApts.length === 0) {
                                 onSlotClick(startSlot, endSlot);
                              }
                           }}
                        >
                           {slotApts.map((apt) => {
                              const customer = customers.find(
                                 (c) => c.id === apt.customer_id
                              );

                           return (
                              <div
                                 key={apt.id}
                                 className="px-2 py-1 rounded text-white text-[10px] mb-1"
                                 style={{
                                    backgroundColor: customer?.color || "#3b82f6",
                                 }}
                              >
                                 <div className="font-semibold truncate">
                                    {customer?.full_name || "Unknown"}
                                 </div>
                                 <div>
                                    {new Date(apt.start_time).toLocaleTimeString([], {
                                       hour: "2-digit",
                                       minute: "2-digit",
                                    })}
                                 </div>
                              </div>
                           );
                           })}
                        </div>
                     );
                  })}
               </React.Fragment>
            ))}
         </div>
      </div>
   );
}

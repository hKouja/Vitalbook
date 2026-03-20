import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authHeader } from "../api/http";
import { API_BASE } from "../api";
import "../css/appointments.css";

interface Appointment {
   id: string;
   customer_id: string;
   start_time: string;
   end_time: string;
   notes?: string;
}

interface Customer {
   id: string;
   full_name: string;
   phone_number?: string;
   color?: string;
}

interface AppointmentWithCustomer extends Appointment {
   full_name?: string;
   phone_number?: string;
   color?: string;
}

const API_URL = `${API_BASE}/api`;

function formatDate(iso: string) {
   const d = new Date(iso);
   return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
   });
}

function formatTime(iso: string) {
   const d = new Date(iso);
   return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
   });
}

export default function Appointments() {
   const navigate = useNavigate();

   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);
   const [query, setQuery] = useState("");
   const [tab, setTab] = useState<"upcoming" | "past" | "all">("all");

   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
         navigate("/");
         return;
      }

      (async () => {
         try {
            const [customersRes, appointmentsRes] = await Promise.all([
               fetch(`${API_URL}/customers`, {
                  headers: { ...authHeader() },
               }),
               fetch(`${API_URL}/appointments`, {
                  headers: { ...authHeader() },
               }),
            ]);

            if (customersRes.status === 401 || appointmentsRes.status === 401) {
               navigate("/");
               return;
            }

            if (!customersRes.ok) throw new Error("Failed to load customers");
            if (!appointmentsRes.ok) throw new Error("Failed to load appointments");

            const customersData = (await customersRes.json()) as Customer[];
            const appointmentsData = (await appointmentsRes.json()) as Appointment[];

            appointmentsData.sort(
               (a, b) =>
                  new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            setCustomers(customersData);
            setAppointments(appointmentsData);
         } catch (err) {
            console.error("Appointments page load error:", err);
         } finally {
            setLoading(false);
         }
      })();
   }, [navigate]);

   const mergedAppointments = useMemo<AppointmentWithCustomer[]>(() => {
      return appointments.map((a) => {
         const customer = customers.find((c) => c.id === a.customer_id);

         return {
            ...a,
            full_name: customer?.full_name || "Unknown patient",
            phone_number: customer?.phone_number || "",
            color: customer?.color || "#3b82f6",
         };
      });
   }, [appointments, customers]);

   const filteredAppointments = useMemo(() => {
      const now = Date.now();
      const q = query.trim().toLowerCase();

      let list = [...mergedAppointments];

      if (tab === "upcoming") {
         list = list.filter((a) => new Date(a.end_time).getTime() >= now);
      } else if (tab === "past") {
         list = list.filter((a) => new Date(a.end_time).getTime() < now);
      }

      if (q) {
         list = list.filter((a) => {
            const name = String(a.full_name ?? "").toLowerCase();
            const phone = String(a.phone_number ?? "").toLowerCase();
            return name.includes(q) || phone.includes(q);
         });
      }

      return list;
   }, [mergedAppointments, query, tab]);

   if (loading) {
      return (
         <div className="vb-appt-page">
            <div className="vb-panel">
               <div className="vb-appt-loading">Loading appointments…</div>
            </div>
         </div>
      );
   }

   return (
      <div className="vb-appt-page">
         <div className="vb-panel">
            <div className="vb-panel-head">
               <div>
                  <h3 className="vb-panel-title">Appointments</h3>
                  <p className="vb-appt-subtitle">
                     View and search appointments by status, patient name, or phone number.
                  </p>
               </div>

               <div className="vb-appt-actions">
                  <input
                     className="vb-input vb-appt-search"
                     placeholder="Search by patient name or phone number…"
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                  />
               </div>
            </div>

            <div className="vb-appt-tabs">
               <button
                  className={`vb-appt-tab ${tab === "upcoming" ? "vb-appt-tab-active" : ""}`}
                  onClick={() => setTab("upcoming")}
                  type="button"
               >
                  Upcoming
               </button>

               <button
                  className={`vb-appt-tab ${tab === "past" ? "vb-appt-tab-active" : ""}`}
                  onClick={() => setTab("past")}
                  type="button"
               >
                  Past
               </button>

               <button
                  className={`vb-appt-tab ${tab === "all" ? "vb-appt-tab-active" : ""}`}
                  onClick={() => setTab("all")}
                  type="button"
               >
                  All
               </button>
            </div>

            <div className="vb-appt-list">
               {filteredAppointments.length === 0 ? (
                  <div className="vb-appt-empty">No appointments found for this filter.</div>
               ) : (
                  filteredAppointments.map((a) => (
                     <button
                        className="vb-appt-row"
                        key={a.id}
                        type="button"
                        onClick={() =>
                           navigate("/calendar", {
                              state: {
                                 focusAppointmentId: a.id,
                                 focusDate: a.start_time,
                              },
                           })
                        }
                     >
                        <span
                           className="vb-appt-color"
                           style={{ backgroundColor: a.color || "#3b82f6" }}
                        />

                        <div className="vb-appt-main">
                           <div className="vb-appt-name">{a.full_name || "Unknown patient"}</div>
                           <div className="vb-appt-phone">{a.phone_number || "-"}</div>
                        </div>

                        <div className="vb-appt-dateblock">
                           <div className="vb-appt-date">{formatDate(a.start_time)}</div>
                           <div className="vb-appt-time">
                              {formatTime(a.start_time)} – {formatTime(a.end_time)}
                           </div>
                        </div>

                        <div className="vb-appt-notes">
                           {a.notes && a.notes.trim() !== "" ? a.notes : "No notes"}
                        </div>
                     </button>
                  ))
               )}
            </div>
         </div>
      </div>
   );
}
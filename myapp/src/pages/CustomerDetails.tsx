import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { authHeader } from "../api/http";
import { API_BASE } from "../api";
import "../css/customerDetails.css";

interface Customer {
   id: string;
   full_name: string;
   phone_number: string;
   security_number?: string;
   color: string;
   created_at: string;
}

interface Appointment {
   id: string;
   customer_id: string;
   start_time: string;
   end_time: string;
   notes?: string;
}

const API_URL = `${API_BASE}/api`;

function formatDateTime(iso: string) {
   const d = new Date(iso);
   return d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   });
}

function formatDate(iso: string) {
   const d = new Date(iso);
   return d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
   });
}

export default function CustomerDetails() {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const location = useLocation();

   const [customer, setCustomer] = useState<Customer | null>(null);
   const [appointments, setAppointments] = useState<Appointment[]>([]);
   const [loading, setLoading] = useState(true);
   const [tab, setTab] = useState<"upcoming" | "past" | "all">("all");

   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
         navigate("/");
         return;
      }

      if (!id) return;

      (async () => {
         try {
            const [customerRes, appointmentsRes] = await Promise.all([
               fetch(`${API_URL}/customers/${id}`, {
                  headers: { ...authHeader() },
               }),
               fetch(`${API_URL}/customers/${id}/appointments`, {
                  headers: { ...authHeader() },
               }),
            ]);

            if (customerRes.status === 401 || appointmentsRes.status === 401) {
               navigate("/");
               return;
            }

            if (!customerRes.ok) throw new Error("Failed to load customer");
            if (!appointmentsRes.ok) throw new Error("Failed to load appointments");

            const customerData = (await customerRes.json()) as Customer;
            const appointmentsData = (await appointmentsRes.json()) as Appointment[];

            appointmentsData.sort(
               (a, b) =>
                  new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            setCustomer(customerData);
            setAppointments(appointmentsData);
         } catch (err) {
            console.error("Customer details load error:", err);
         } finally {
            setLoading(false);
         }
      })();
   }, [id, navigate]);

   const now = Date.now();

   const upcomingAppointments = useMemo(
      () => appointments.filter((a) => new Date(a.end_time).getTime() >= now),
      [appointments, now]
   );

   const pastAppointments = useMemo(
      () => appointments.filter((a) => new Date(a.end_time).getTime() < now),
      [appointments, now]
   );

   const nextAppointment = upcomingAppointments[0] ?? null;
   const lastAppointment = [...pastAppointments].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
   )[0] ?? null;

   const visibleAppointments = useMemo(() => {
      if (tab === "upcoming") return upcomingAppointments;
      if (tab === "past") return [...pastAppointments].sort(
         (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      return appointments;
   }, [appointments, upcomingAppointments, pastAppointments, tab]);

   if (loading) {
      return (
         <div className="vb-cd-page">
            <div className="vb-panel">
               <div className="vb-cd-loading">Loading customer…</div>
            </div>
         </div>
      );
   }

   if (!customer) {
      return (
         <div className="vb-cd-page">
            <div className="vb-panel">
               <div className="vb-cd-empty">Customer not found.</div>
            </div>
         </div>
      );
   }

   return (
      <div className="vb-cd-page">
         <div className="vb-panel">
            <div className="vb-cd-top">
               <div className="vb-cd-head">
                  <span
                     className="vb-cd-dot"
                     style={{ backgroundColor: customer.color || "#3b82f6" }}
                  />
                  <div>
                     <h2 className="vb-cd-name">{customer.full_name}</h2>
                     <div className="vb-cd-sub">
                        Added {formatDate(customer.created_at)}
                     </div>
                  </div>
               </div>

               <div className="vb-cd-actions">
                  <button
                     className="vb-btn"
                     type="button"
                     onClick={() => navigate("/customers")}
                  >
                     Back
                  </button>

                  <button
                     className="vb-btn vb-btn-primary"
                     type="button"
                     onClick={() =>
                        navigate("/calendar", {
                           state: {
                              preselectedCustomerId: customer.id,
                           },
                        })
                     }
                  >
                     Book appointment
                  </button>
               </div>
            </div>

            <div className="vb-cd-grid">
               <div className="vb-cd-card">
                  <div className="vb-cd-label">Phone</div>
                  <div className="vb-cd-value">{customer.phone_number || "-"}</div>
               </div>

               <div className="vb-cd-card">
                  <div className="vb-cd-label">Security number</div>
                  <div className="vb-cd-value">{customer.security_number || "-"}</div>
               </div>

               <div className="vb-cd-card">
                  <div className="vb-cd-label">Total appointments</div>
                  <div className="vb-cd-value">{appointments.length}</div>
               </div>

               <div className="vb-cd-card">
                  <div className="vb-cd-label">Upcoming appointments</div>
                  <div className="vb-cd-value">{upcomingAppointments.length}</div>
               </div>

               <div className="vb-cd-card">
                  <div className="vb-cd-label">Next appointment</div>
                  <div className="vb-cd-value">
                     {nextAppointment ? formatDateTime(nextAppointment.start_time) : "-"}
                  </div>
               </div>

               <div className="vb-cd-card">
                  <div className="vb-cd-label">Last appointment</div>
                  <div className="vb-cd-value">
                     {lastAppointment ? formatDateTime(lastAppointment.start_time) : "-"}
                  </div>
               </div>
            </div>

            <div className="vb-cd-section-head">
               <h3 className="vb-panel-title">Appointments</h3>

               <div className="vb-cd-tabs">
                  <button
                     className={`vb-cd-tab ${tab === "upcoming" ? "is-active" : ""}`}
                     type="button"
                     onClick={() => setTab("upcoming")}
                  >
                     Upcoming
                  </button>
                  <button
                     className={`vb-cd-tab ${tab === "past" ? "is-active" : ""}`}
                     type="button"
                     onClick={() => setTab("past")}
                  >
                     Past
                  </button>
                  <button
                     className={`vb-cd-tab ${tab === "all" ? "is-active" : ""}`}
                     type="button"
                     onClick={() => setTab("all")}
                  >
                     All
                  </button>
               </div>
            </div>

            <div className="vb-cd-list">
               {visibleAppointments.length === 0 ? (
                  <div className="vb-cd-empty">No appointments yet.</div>
               ) : (
                  visibleAppointments.map((a) => (
                     <button
                        key={a.id}
                        className="vb-cd-row"
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
                        <div className="vb-cd-row-main">
                           <div className="vb-cd-row-date">
                              {formatDateTime(a.start_time)}
                           </div>
                           <div className="vb-cd-row-time">
                              Ends {formatDateTime(a.end_time)}
                           </div>
                        </div>

                        <div className="vb-cd-row-notes">
                           {a.notes && a.notes.trim() ? a.notes : "No notes"}
                        </div>
                     </button>
                  ))
               )}
            </div>
         </div>
      </div>
   );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "../css/dashboard.css";

//icons:
import calendar from "../assets/icons/calendar3.png";
import pin from "../assets/icons/pin3.png";
import customer from "../assets/icons/customer3.png";

interface Appointment {
   id: string;
   start_time: string;
   end_time: string;
   notes?: string;
   full_name?: string;
   color?: string;
   phone_number?: string;
}

interface Customer {
   id: string;
   full_name: string;
}

export default function Dashboard() {

   const navigate = useNavigate();
   const [fullName, setFullName] = useState("");
   const [appointmentsToday, setAppointmentsToday] = useState(0);
   const [totalCustomers, setTotalCustomers] = useState(0);

   const [todayList, setTodayList] = useState<Appointment[]>([]);

   useEffect(() => {
      const token = localStorage.getItem("token");
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
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

      // Fetch appointments (with customers)
      fetch(
         `http://localhost:4000/api/appointments-with-customers?start=${encodeURIComponent(
            todayStart.toISOString()
         )}&end=${encodeURIComponent(todayEnd.toISOString())}`,
         {
            headers: { Authorization: `Bearer ${token}` },
         })
         .then((res) => res.json())
         .then((data: Appointment[]) => {
            const sorted = data.sort(
               (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
            setAppointmentsToday(sorted.length);
            setTodayList(sorted);
         })
         .catch((err) => console.error("Appointments fetch error:", err));
   }, [navigate]);
   
   function formatTime(iso: string) {
      const dt = new Date(iso);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
   }

   return (
      <div>
         {/* Header */}
         <header className="vb-header">
            <h1 className="vb-title">Dashboard</h1>
            <p className="vb-subtitle">
            Welcome, <span className="vb-name">{fullName}</span>. Here’s your overview for today.
            </p>
         </header>

         {/* Stat cards */}
         <section className="vb-cards">
            <div className="vb-card">
            <div>
               <div className="vb-card-label">Today’s Appointments</div>
               <div className="vb-card-value">{appointmentsToday}</div>
            </div>
            <div className="vb-card-icon vb-icon-indigo">
               <img 
                     className="vb-nav-icon-img"
                     src= {calendar} 
                     alt="Calendar"
                     draggable={false}
               />
            </div>
            </div>

            <div className="vb-card">
            <div>
               <div className="vb-card-label">Total Customers</div>
               <div className="vb-card-value">{totalCustomers}</div>
            </div>
            <div className="vb-card-icon vb-icon-green">
               <img 
                     className="vb-nav-icon-img"
                     src= {customer} 
                     alt="Customer"
                     draggable={false}
               />
            </div>
            </div>

            <div className="vb-card">
            <div>
               <div className="vb-card-label">This Week</div>
               <div className="vb-card-value">—</div>
            </div>
            <div className="vb-card-icon vb-icon-amber">
               <img 
                     className="vb-nav-icon-img"
                     src= {pin} 
                     alt="Pin"
                     draggable={false}
               />
            </div>
            </div>
         </section>

         {/* Today schedule panel */}
         <section className="vb-panel">
            <div className="vb-panel-head">
            <div>
               <h2 className="vb-panel-title">Today’s Schedule</h2>
               <div className="vb-panel-date">
                  {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  })}
               </div>
            </div>

            <Link to="/calendar" className="vb-link">
               Open calendar →
            </Link>
            </div>
            <div className="vb-schedule">
               {todayList.map((a) => (
                  <div key={a.id} className="vb-schedule-item">
                     <div
                        className="vb-schedule-color"
                        style={{ backgroundColor: a.color || "#4f46e5" }}
                     />
                     <div className="vb-schedule-mid">
                        <div className="vb-schedule-name">{a.full_name || "Unknown"}</div>
                        <div className="vb-schedule-phone">{a.phone_number || "-"}</div>
                     </div>
                     <div className="vb-schedule-right">
                        <div className="vb-schedule-meta">
                           {formatTime(a.start_time)} – {formatTime(a.end_time)}
                           
                        </div>
                        <div className="vb-schedule-notes">{a.notes || "-"}</div>
                     </div>
                  </div>
               ))}
            </div>
         </section>
      </div>
      );

}

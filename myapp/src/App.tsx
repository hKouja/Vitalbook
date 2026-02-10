import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Appointments from "./pages/Appointments";
//import Calendar from "./pages/Calendar";
import CalendarPage from "./pages/CalendarPage";
import Layout from "./layout/Layout";

//<Route path="/calendar" element={<Calendar />} />

export default function App() {
   return (
      <BrowserRouter>
         <Routes>
            {/* public */}
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Login />} />

            {/* protected layout */}
            <Route element={<Layout />}>
               <Route path="/dashboard" element={<Dashboard/>} />
               <Route path="/customers" element={<Customers/>} />
               <Route path="/appointments" element={<Appointments />} />
               <Route path="/calendar" element={<CalendarPage />} />   
            </Route>
         </Routes>
      </BrowserRouter>
   );
}

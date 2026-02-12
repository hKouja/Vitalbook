import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../css/layout.css";
import lightDash from "../assets/icons/dashboard1.png";
import darkDash from "../assets/icons/dashboard2.png";
import lightCal from "../assets/icons/calendar1.png";
import darkCal from "../assets/icons/calendar2.png";
import lightPin from "../assets/icons/pin1.png";
import darkPin from "../assets/icons/pin2.png";
import lightCust from "../assets/icons/customer1.png";
import darkCust from "../assets/icons/customer2.png";
import lightSign from "../assets/icons/signout1.png";
import darkSign from "../assets/icons/signout2.png";

export default function Layout() {

  type ThemeIconProps = {
    isDark: boolean;
    lightSrc: string;
    darkSrc: string;
    alt: string;
  };


  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = useState(false);

  const [isNavOpen, setIsNavOpen] = useState(false);

  function closeNav() {
    setIsNavOpen(false);
  }

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/");
  }, [navigate]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
        const next = !prev;
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        return next;
    });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("full_name");
    navigate("/");
  }
  
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  //icons here:
  function ThemeIcon({ isDark, lightSrc, darkSrc, alt }: ThemeIconProps) {
    return (
        <img
        src={isDark ? lightSrc : darkSrc}
        alt={alt}
        className="vb-nav-icon-img"
        draggable={false}
        />
    );
  }

  return (
    <div className="vb-app">
      {/* Sidebar */}
      <aside className="vb-sidebar">
        <div className="vb-brand">
          <div className="vb-logo">V</div>
          <div className="vb-brand-text">
            <div className="vb-brand-title">Vitalbook</div>
            <div className="vb-brand-subtitle">Booking System</div>
          </div>
        <button className="vb-theme-toggle" onClick={toggleTheme} type="button">
            <span className={`vb-switch ${isDark ? "vb-switch-on" : ""}`}>
                <span className="vb-switch-thumb" />
            </span>
        </button>
        </div>

        <nav className="vb-nav">
          <Link to="/dashboard" className={`vb-nav-item ${isActive("/dashboard") ? "vb-active" : ""}`}>
            <span className="vb-nav-icon">
                <ThemeIcon 
                    isDark={isDark}
                    lightSrc={lightDash}
                    darkSrc={darkDash}
                    alt="Dashboard"
                />
            </span>
            Dashboard
          </Link>

          <Link to="/calendar" className={`vb-nav-item ${isActive("/calendar") ? "vb-active" : ""}`}>
            <span className="vb-nav-icon">
                <ThemeIcon 
                    isDark={isDark}
                    lightSrc={lightCal}
                    darkSrc={darkCal}
                    alt="Calendar"
                />
            </span>
            Calendar
          </Link>

          <Link to="/customers" className={`vb-nav-item ${isActive("/customers") ? "vb-active" : ""}`}>
            <span className="vb-nav-icon">
                <ThemeIcon 
                    isDark={isDark}
                    lightSrc={lightCust}
                    darkSrc={darkCust}
                    alt="Customers"
                />
            </span>
            Customers
          </Link>

          <Link to="/appointments" className={`vb-nav-item ${isActive("/appointments") ? "vb-active" : ""}`}>
            <span className="vb-nav-icon">
                <ThemeIcon 
                    isDark={isDark}
                    lightSrc={lightPin}
                    darkSrc={darkPin}
                    alt="Appointments"
                />
            </span>
            Appointments
          </Link>
        </nav>

        <div className="vb-sidebar-footer">
          <button className="vb-signout" onClick={handleLogout}>
            <span className="vb-nav-icon">
                <ThemeIcon 
                    isDark={isDark}
                    lightSrc={lightSign}
                    darkSrc={darkSign}
                    alt="Sign out"
                />
            </span>
            Sign out
          </button>
        </div>
          
      </aside>

      {/* Main content */}
      <main className="vb-main">
        <Outlet />
        <button
            className="vb-hamburger"
            type="button"
            onClick={() => setIsNavOpen(true)}
            aria-label="Open menu"
            >
            <span />
            <span />
            <span />
        </button>
      </main>


      {/* Mobile drawer overlay */}
        <div
        className={`vb-drawer-overlay ${isNavOpen ? "is-open" : ""}`}
        onClick={closeNav}
        >
        <aside className="vb-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="vb-drawer-head">
            <div className="vb-brand">
                <div className="vb-logo">V</div>
                <div className="vb-brand-text">
                <div className="vb-brand-title">Vitalbook</div>
                <div className="vb-brand-subtitle">Booking System</div>
                </div>
            </div>

            <button className="vb-drawer-close" onClick={closeNav} type="button" aria-label="Close menu">
                ✕
            </button>
            </div>

            <nav className="vb-nav">
            <Link to="/dashboard" className={`vb-nav-item ${isActive("/dashboard") ? "vb-active" : ""}`}>
                <span className="vb-nav-icon">
                <ThemeIcon isDark={isDark} lightSrc={lightDash} darkSrc={darkDash} alt="Dashboard" />
                </span>
                Dashboard
            </Link>

            <Link to="/calendar" className={`vb-nav-item ${isActive("/calendar") ? "vb-active" : ""}`}>
                <span className="vb-nav-icon">
                <ThemeIcon isDark={isDark} lightSrc={lightCal} darkSrc={darkCal} alt="Calendar" />
                </span>
                Calendar
            </Link>

            <Link to="/customers" className={`vb-nav-item ${isActive("/customers") ? "vb-active" : ""}`}>
                <span className="vb-nav-icon">
                <ThemeIcon isDark={isDark} lightSrc={lightCust} darkSrc={darkCust} alt="Customers" />
                </span>
                Customers
            </Link>

            <Link to="/appointments" className={`vb-nav-item ${isActive("/appointments") ? "vb-active" : ""}`}>
                <span className="vb-nav-icon">
                <ThemeIcon isDark={isDark} lightSrc={lightPin} darkSrc={darkPin} alt="Appointments" />
                </span>
                Appointments
            </Link>
            </nav>

            <div className="vb-sidebar-footer">
            <button className="vb-signout" onClick={handleLogout} type="button">
                <span className="vb-nav-icon">
                <ThemeIcon isDark={isDark} lightSrc={lightSign} darkSrc={darkSign} alt="Sign out" />
                </span>
                Sign out
            </button>
            </div>
        </aside>
        </div>
    </div>
  );
}

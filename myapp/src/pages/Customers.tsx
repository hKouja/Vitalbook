import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authHeader } from "../api/http";
import  "../css/customer.css"

interface Customer {
   id: string;
   full_name: string;
   phone_number: string;
   security_number?: string;
   color: string;
   created_at: string;
}

const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#64748b", // slate
  "#a3a3a3", // neutral gray
] as const;

type PaletteColor = (typeof COLOR_PALETTE)[number];

const API_URL = "http://localhost:4000/api";

export default function Customers() {
   const navigate = useNavigate();
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);

   const [fullName, setFullName] = useState("");
   const [phoneNumber, setPhoneNumber] = useState("");
   const [securityNumber, setSecurityNumber] = useState("");

   const [query, setQuery] = useState("");
   const [isAddOpen, setIsAddOpen] = useState(false);
	const headers = useMemo(() => ({ ...authHeader() }), []);

   const [color, setColor] = useState<PaletteColor>(COLOR_PALETTE[0]);
   const [isColorOpen, setIsColorOpen] = useState(false);

   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
         navigate("/");
         return;
      }

      (async () => {
			try {
				const res = await fetch(`${API_URL}/customers`, { headers });
				if (res.status === 401) {
					navigate("/");
					return;
				}
				if (!res.ok) throw new Error("Failed to load customers");

				const data = (await res.json()) as Customer[];
				// newest first (optional)
				data.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
				setCustomers(data);
			} catch (err) {
				console.error("Failed to load customers:", err);
			} finally {
				setLoading(false);
			}
		})();
	}, [headers, navigate]);

   const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return customers;

		return customers.filter((c) => {
			const name = (c.full_name || "").toLowerCase();
			const phone = (c.phone_number || "").toLowerCase();
			const sec = (c.security_number || "").toLowerCase();
			return name.includes(q) || phone.includes(q) || sec.includes(q);
		});
	}, [customers, query]);

   function openAdd() {
		setIsAddOpen(true);
	}

	function closeAdd() {
      setIsAddOpen(false);
      setIsColorOpen(false);
      setFullName("");
      setPhoneNumber("");
      setSecurityNumber("");
      setColor(COLOR_PALETTE[0]);
	}

   // handle new customer submit
   async function handleAddCustomer(e: React.FormEvent) {
      e.preventDefault();
      try {
         const response = await fetch(`${API_URL}/customers`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json", ...headers },
            body: JSON.stringify({
               full_name: fullName,
               phone_number: phoneNumber,
               security_number: securityNumber || null,
               color: color || "#3b82f6",
            }),
         });

         if (response.status === 401) {
				navigate("/");
				return;
			}

         if (!response.ok) throw new Error("Failed to add customer");

         const newCustomer: Customer = await response.json() as Customer;
         setCustomers((prev) => [newCustomer, ...prev]);
			closeAdd();
		} catch (err) {
			console.error("Add customer error:", err);
			alert("Failed to add customer.");
		}
   }

   if (loading) {
		return (
			<div className="vb-cust-page">
				<div className="vb-panel">
					<div className="vb-cust-loading">Loading customers…</div>
				</div>
			</div>
		);
	}

   

   return (
		<div className="vb-cust-page">
			<div className="vb-panel">
				<div className="vb-panel-head">
					<div>
						<h3 className="vb-panel-title">Customers</h3>
						
					</div>

					<div className="vb-cust-actions">
						<input
							className="vb-input vb-cust-search"
							placeholder="Search name, phone, or security number…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
						<button className="vb-btn vb-btn-primary" onClick={openAdd} type="button">
							+ Add customer
						</button>
					</div>
				</div>

				<div className="vb-cust-list">
					{filtered.length === 0 ? (
						<div className="vb-cust-empty">
							No customers found.
						</div>
					) : (
						filtered.map((c) => (
							<div className="vb-cust-row" key={c.id}>
								<span
									className="vb-cust-dot"
									style={{ backgroundColor: c.color || "#3b82f6" }}
								/>
								<div className="vb-cust-mid">
									<div className="vb-cust-name">{c.full_name}</div>
									<div className="vb-cust-phone">{c.phone_number || "-"}</div>
								</div>

								<div className="vb-cust-right">
									<div className="vb-cust-added">
										{new Date(c.created_at).toLocaleDateString()}
									</div>
									{/* later: View Edit buttons or a 3-dot menu */}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Add customer modal */}
			{isAddOpen && (
				<div className="vb-modal-overlay" onClick={closeAdd}>
					<div className="vb-modal" onClick={(e) => e.stopPropagation()}>
						<h3>New customer</h3>

						<form onSubmit={handleAddCustomer}>
							<label className="vb-field-label">Full name</label>
							<input
								className="vb-input"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								placeholder="e.g. John Smith"
								required
							/>

							<div className="vb-spacer-12" />

							<label className="vb-field-label">Phone number</label>
							<input
								className="vb-input"
								value={phoneNumber}
								onChange={(e) => setPhoneNumber(e.target.value)}
								placeholder="e.g. 070-123 45 67"
								required
							/>

							<div className="vb-spacer-12" />

							<label className="vb-field-label">Security number (optional)</label>
							<input
								className="vb-input"
								value={securityNumber}
								onChange={(e) => setSecurityNumber(e.target.value)}
								placeholder="Optional"
							/>

							<div className="vb-spacer-12" />

                     <div className="vb-color-row">
                     <button
                        type="button"
                        className="vb-color-current"
                        onClick={() => setIsColorOpen((v) => !v)}
                        aria-label="Choose customer color"
                        title="Choose color"
                     >
                        <span className="vb-color-dot" style={{ backgroundColor: color }} />
                     </button>

                     {isColorOpen && (
                        <div className="vb-color-pop" role="listbox" aria-label="Color palette">
                           {COLOR_PALETTE.map((c) => (
                           <button
                              key={c}
                              type="button"
                              className={`vb-color-choice ${c === color ? "is-selected" : ""}`}
                              onClick={() => {
                                 setColor(c);
                                 setIsColorOpen(false);
                              }}
                              title={c}
                           >
                              <span className="vb-color-dot" style={{ backgroundColor: c }} />
                           </button>
                           ))}
                        </div>
                     )}
                     <div className="vb-modal-actions">
                        <button className="vb-btn" onClick={closeAdd} type="button">
                           Cancel
                        </button>
                        <button className="vb-btn vb-btn-primary" type="submit">
                           Create
                        </button>
                     </div>
                  </div>
					</form>
				</div>
			</div>
		)}
		</div>
	);
}

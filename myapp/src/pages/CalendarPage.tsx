import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventInput } from "@fullcalendar/core";
import { authHeader } from "../api/http";

const API_URL = "http://localhost:4000/api";

type Customer = { id: string;
  full_name: string; 
  color?: string 
};
type AppointmentRow = {
  id: string;
  customer_id: string;
  start_time: string; // ISO
  end_time: string;   // ISO
  notes?: string;
};
type PendingMove = {
  id: string;
  start: Date;
  end: Date;
  revert: () => void;
  oldNotes: string;
};
type EditingAppt = {
  id: string;
  notes: string;
};

export default function CalendarPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventInput[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedStart, setSelectedStart] = useState<string>("");
  const [selectedEnd, setSelectedEnd] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const headers = useMemo(() => ({ ...authHeader() }), []);

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [moveNotes, setMoveNotes] = useState("");

  const [editing, setEditing] = useState<EditingAppt | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Redirect if no token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/");
  }, [navigate]);

  // Load customers once (for the dropdown)
  useEffect(() => {
    fetch(`${API_URL}/customers`, { headers })
      .then(async (res) => {
        if (res.status === 401) { navigate("/"); throw new Error("Unauthorized"); }
        if (!res.ok) throw new Error("Failed to load customers");
        return res.json();
      })
      .then((data: Customer[]) => setCustomers(data))
      .catch(console.error);
  }, [headers, navigate]);

  async function loadAppointments(startIso: string, endIso: string) {
    const url = new URL(`${API_URL}/appointments-with-customers`);
    url.searchParams.set("start", startIso);
    url.searchParams.set("end", endIso);

    const res = await fetch(url.toString(), { headers });
    if (res.status === 401) { navigate("/"); return; }
    if (!res.ok) throw new Error("Failed to load appointments");

    const rows = (await res.json()) as (AppointmentRow & { full_name: string; color: string })[];

    const mapped: EventInput[] = rows.map((a) => ({
      id: a.id,
      title: a.full_name,
      start: a.start_time,
      end: a.end_time,
      backgroundColor: a.color || undefined,
      borderColor: a.color || undefined,
      extendedProps: {
        customer_id: a.customer_id,
        notes: a.notes ?? "",
      },
    }));

    setEvents(mapped);
  }

  function handleSelect(arg: DateSelectArg) {
    setSelectedStart(arg.startStr);
    setSelectedEnd(arg.endStr);
    setCustomerId("");
    setNotes("");
    setIsOpen(true);
  }

  async function createAppointment() {
    if (!customerId) return alert("Choose a customer.");

    const res = await fetch(`${API_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        customer_id: customerId,
        start_time: selectedStart,
        end_time: selectedEnd,
        notes,
      }),
    });

    if (res.status === 401) { navigate("/"); return; }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return alert(j.error || "Failed to create appointment");
    }

    setIsOpen(false);

    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 7);
    const end = new Date(now); end.setDate(now.getDate() + 14);
    await loadAppointments(start.toISOString(), end.toISOString());
  }


  // --------------------------------------------------------------
  // ----------- Start of the drag and drop functions -------------
  // --------------------------------------------------------------

  function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && aEnd > bStart;
  }

  function isOverlapping(movingId: string, newStart: Date, newEnd: Date) {
    return events.some((e: any) => {
      if (String(e.id) === String(movingId)) return false;
      const s = new Date(e.start as string);
      const en = new Date(e.end as string);
      return overlaps(newStart, newEnd, s, en);
    });
  }

  async function confirmMove() {
    if (!pendingMove) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${pendingMove.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          start_time: pendingMove.start.toISOString(),
          end_time: pendingMove.end.toISOString(),
          notes: moveNotes, // update notes if changed
        }),
      });

      if (!res.ok) throw new Error("Failed to update appointment");

      // update local state
      setEvents((prev: any[]) =>
        prev.map((ev) =>
          String(ev.id) === String(pendingMove.id)
            ? {
                ...ev,
                start: pendingMove.start.toISOString(),
                end: pendingMove.end.toISOString(),
                extendedProps: { ...(ev.extendedProps || {}), notes: moveNotes },
              }
            : ev
        )
      );

      setPendingMove(null);
    } catch (err) {
      console.error(err);
      pendingMove.revert(); // if backend fails, revert
      setPendingMove(null);
    }
  }

  function cancelMove() {
    if (!pendingMove) return;
    pendingMove.revert();   // revert to original time
    setPendingMove(null);
  }


  // handlers here:
  //drag handler
  async function handleEventDrop(info: any) {
    const id = info.event.id;
    const newStart = info.event.start!;
    const newEnd = info.event.end!;

    if (isOverlapping(id, newStart, newEnd)) {
      info.revert();
      return;
    }

    const oldNotes = (info.event.extendedProps?.notes ?? "") as string;

    setPendingMove({
      id,
      start: newStart,
      end: newEnd,
      revert: () => info.revert(),
      oldNotes,
    });

    setMoveNotes(oldNotes);
      
  }

  // resize handler
  async function handleEventResize(info: any) {
    const id = info.event.id;
    const newStart = info.event.start!;
    const newEnd = info.event.end!;

    if (isOverlapping(id, newStart, newEnd)) {
      info.revert();
      return;
    }

    const oldNotes = (info.event.extendedProps?.notes ?? "") as string;

    setPendingMove({
      id,
      start: newStart,
      end: newEnd,
      revert: () => info.revert(),
      oldNotes,
    });

    setMoveNotes(oldNotes);      
  }
  
 // -----------------------------------------------------------------------

  async function saveNotesOnly() {
    if (!editing) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ notes: editNotes }),
      });

      if (!res.ok) throw new Error("Failed to update notes");

      // update local state
      setEvents((prev: any[]) =>
        prev.map((ev) =>
          String(ev.id) === String(editing.id)
            ? {
                ...ev,
                extendedProps: { ...(ev.extendedProps || {}), notes: editNotes },
              }
            : ev
        )
      );

      setEditing(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update notes");
    }
  }

  async function deleteAppointment() {
    if (!editing) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${editing.id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });

      if (!res.ok) throw new Error("Failed to delete appointment");

      setEvents((prev: any[]) => prev.filter((e: any) => String(e.id) !== String(editing.id)));
      setEditing(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete appointment");
    }
  }



  function handleEventClick(info: any) {
    const id = info.event.id as string;
    const notes = (info.event.extendedProps?.notes ?? "") as string;

    setEditing({ id, notes });
    setEditNotes(notes);
    setConfirmDelete(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Calendar</h2>

      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        customButtons={{
          dashboard: {
            text: "Dashboard",
            click: () => navigate("/dashboard"),
          },
        }}
        headerToolbar={{
          left: "prev,next today dashboard",
          center: "title",
          right: "timeGridWeek,dayGridMonth",
        }}
        selectable
        select={handleSelect}
        height="auto"
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        events={events}
        datesSet={(info) => {
          // whenever the visible date range changes (week/month nav), load data
          loadAppointments(info.start.toISOString(), info.end.toISOString()).catch(console.error);
        }}
        // the drag and drop function
          editable
          eventDurationEditable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}

          eventClick={handleEventClick}
      />

      {isOpen && (
        <div 
          style={{
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.35)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            zIndex: 9999, // this helped fix the issue of pop up being under the grid
            pointerEvents: "auto",
          }}
          onClick={() => setIsOpen(false)} 
        >

          <div style={{ background: "grey", 
            width: 420,
            padding: 16, 
            borderRadius: 12,
            position: "relative",
            zIndex: 10000 
            }}
            onClick={ (e) => e.stopPropagation() } 
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>New appointment</h3>

            <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.8 }}>
              {selectedStart} → {selectedEnd}
            </div>

            <label style={{ display: "block", marginBottom: 6 }}>Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              style={{ width: "100%", padding: 8, marginBottom: 12 }}
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: 6 }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", padding: 8, minHeight: 80, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setIsOpen(false)} style={{ padding: "8px 12px" }}>
                Cancel
              </button>
              <button onClick={createAppointment} style={{ padding: "8px 12px" }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingMove && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={cancelMove}
        >
          <div
            style={{
              background: "grey",
              width: 420,
              padding: 16,
              borderRadius: 12,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Confirm reschedule
            </h3>

            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
              {pendingMove.start.toISOString()} → {pendingMove.end.toISOString()}
            </div>

            <label style={{ display: "block", marginBottom: 6 }}>Notes</label>
            <textarea
              value={moveNotes}
              onChange={(e) => setMoveNotes(e.target.value)}
              style={{ width: "100%", padding: 8, minHeight: 90, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelMove} style={{ padding: "8px 12px" }}>
                Cancel
              </button>
              <button onClick={confirmMove} style={{ padding: "8px 12px" }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            style={{
              background: "grey",
              width: 420,
              padding: 16,
              borderRadius: 12,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
              Edit appointment
            </h3>

            <label style={{ display: "block", marginBottom: 6 }}>Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              style={{ width: "100%", padding: 8, minHeight: 90, marginBottom: 12 }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {/* Delete section */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: "8px 12px" }}
                >
                  Delete
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ padding: "8px 12px" }}
                  >
                    Cancel delete
                  </button>
                  <button
                    onClick={deleteAppointment}
                    style={{ padding: "8px 12px" }}
                  >
                    Confirm delete
                  </button>
                </div>
              )}

              {/* Save / Close */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditing(null)} style={{ padding: "8px 12px" }}>
                  Close
                </button>
                <button onClick={saveNotesOnly} style={{ padding: "8px 12px" }}>
                  Save notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

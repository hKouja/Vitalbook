import { useEffect, useMemo, useState, useRef} from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventInput } from "@fullcalendar/core";
import { authHeader } from "../api/http";
import "../css/calendarPage.css";
import { API_BASE } from "../api";

const API_URL = `${API_BASE}/api`; 

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
type EditingAppt = {
  id: string;
  notes: string;
};
type Change = {
  id: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
};
type StagedCreate = {
  tempId: string;
  customer_id: string;
  start_time: string; // ISO
  end_time: string;   // ISO
  notes: string;
  title: string;
  color?: string;
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

  const [editing, setEditing] = useState<EditingAppt | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [stagedCreates, setStagedCreates] = useState<Record<string, StagedCreate>>({});
  const [stagedChanges, setStagedChanges] = useState<Record<string, Change>>({});
  const [showDoneConfirm, setShowDoneConfirm] = useState(false);
  const [lastRange, setLastRange] = useState<{ startIso: string; endIso: string } | null>(null);
  
  const changeCount = Object.keys(stagedChanges).length + Object.keys(stagedCreates).length;

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
    setStagedChanges({});
  }

  function handleSelect(arg: DateSelectArg) {
    setSelectedStart(arg.startStr);
    setSelectedEnd(arg.endStr);
    setCustomerId("");
    setNotes("");
    setIsOpen(true);
  }

  function createAppointment() {
    if (!customerId) return alert("Choose a customer.");

    const c = customers.find((x) => String(x.id) === String(customerId));
    if (!c) return alert("Customer not found.");

    const tempId = `tmp-${Date.now}`; // or Date.now()

    // 1) add a temporary event to the calendar UI
    setEvents((prev) => [
      ...prev,
      {
        id: tempId,
        title: c.full_name,
        start: selectedStart,
        end: selectedEnd,
        backgroundColor: c.color || undefined,
        borderColor: c.color || undefined,
        extendedProps: {
          customer_id: customerId,
          notes: notes ?? "",
          isTemp: true,
        },
      },
    ]);

    // 2) stage the create so it appears in "unsaved changes"
    setStagedCreates((prev) => ({
      ...prev,
      [tempId]: {
        tempId,
        customer_id: customerId,
        start_time: selectedStart,
        end_time: selectedEnd,
        notes: notes ?? "",
        title: c.full_name,
        color: c.color,
      },
    }));

    // 3) close modal
    setIsOpen(false);
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

  function stageChange(args: { id: string; oldStart: Date; oldEnd: Date; newStart: Date; newEnd: Date }) {
    const { id, oldStart, oldEnd, newStart, newEnd } = args;

    //if the event just created
    if(id.startsWith("tmp-")) {
      setStagedCreates((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return {
          ...prev,
          [id]: {
            ...cur,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          },
        };
      });

    // keep UI in sync
      setEvents((prev: any[]) =>
        prev.map((ev) =>
          String(ev.id) === id ? { ...ev, start: newStart.toISOString(), end: newEnd.toISOString() } : ev
        )
      );
      return;
    }

    //otherwise the even exists
    setStagedChanges((prev) => ({
        ...prev,
        [id]: {
          id,
          oldStart: oldStart.toISOString(),
          oldEnd: oldEnd.toISOString(),
          newStart: newStart.toISOString(),
          newEnd: newEnd.toISOString(),
        },
    }));

    // Keep events state in sync so FullCalendar doesn't "snap back" on rerender.
    setEvents((prev: any[]) =>
      prev.map((ev) => (String(ev.id) === id ? { ...ev, start: newStart.toISOString(), end: newEnd.toISOString() } : ev))
    );
  }

  async function handleEventDrop(info: any) {
    const id = info.event.id;
    const newStart = info.event.start!;
    const newEnd = info.event.end!;

    if (isOverlapping(id, newStart, newEnd)) {
      info.revert();
      return;
    }

    const oldStart: Date = info.oldEvent?.start ?? newStart;
    const oldEnd: Date = info.oldEvent?.end ?? newEnd;

    stageChange({ id, oldStart, oldEnd, newStart, newEnd });
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

    const oldStart: Date = info.oldEvent?.start ?? newStart;
    const oldEnd: Date = info.oldEvent?.end ?? newEnd;

    stageChange({ id, oldStart, oldEnd, newStart, newEnd });
  }

  async function cancelAllChanges() {
    setShowDoneConfirm(false);
    setStagedChanges({});
    setStagedCreates({});

    if (lastRange) {
        await loadAppointments(lastRange.startIso, lastRange.endIso);
    }
  }
  
  async function saveAllChanges() {
    const creates = Object.values(stagedCreates);
    const updates = Object.values(stagedChanges);

    if (creates.length === 0 && updates.length === 0) {
        setShowDoneConfirm(false);
        return;
    }

    try {
      // save staged creates
      for (const c of creates) {
        const res = await fetch(`${API_URL}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({
            customer_id: c.customer_id,
            start_time: c.start_time,
            end_time: c.end_time,
            notes: c.notes,
          }),
        });

        if (res.status === 401) { navigate("/"); return; }
        if (!res.ok) throw new Error("Failed to create appointment");

        const created = await res.json(); // expect it returns {id, ...}

      // swap temp event id -> real id in UI
        setEvents((prev: any[]) =>
          prev.map((ev) =>
            String(ev.id) === c.tempId
              ? { ...ev, id: String(created.id), extendedProps: { ...(ev.extendedProps || {}), isTemp: false } }
              : ev
          )
        );
      }

      //save stage updates
      for (const c of updates) {
        const res = await fetch(`${API_URL}/appointments/${c.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({
              start_time: c.newStart,
              end_time: c.newEnd,
            }),
        });

        if (res.status === 401) {
            navigate("/");
            return;
        }

        if (!res.ok) {
            throw new Error(`Failed to update appointment ${c.id}`);
        }
      }

      //clear staged
      setStagedCreates({});
      setStagedChanges({});
      setShowDoneConfirm(false);

      if (lastRange) await loadAppointments(lastRange.startIso, lastRange.endIso);

      //here the messaging function can be added when intoruced

    } catch (err) {
        console.error(err);
        alert("Failed to save changes. Reverting…");
        await cancelAllChanges();
    }
  }

  async function saveNotesOnly() {
    if (!editing) return;

    try {
      const res = await fetch(`${API_URL}/appointments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ notes: editNotes }),
      });

      if (res.status === 401) {
            navigate("/");
            return;
      }

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

      if (res.status === 401) {
        navigate("/");
        return;
      }

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

  // Swipe thing here:
  
  const calRef = useRef<FullCalendar | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  
  
  

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const minSwipePx = 60;      // how far to swipe
    const maxOffAxisPx = 50;    // ignore if too vertical

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isTracking = true;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isTracking) return;
      isTracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const dx = endX - startX;
      const dy = endY - startY;

      // Must be mostly horizontal + far enough
      if (Math.abs(dx) < minSwipePx) return;
      if (Math.abs(dy) > maxOffAxisPx) return;

      const api = calRef.current?.getApi();
      if (!api) return;

      if (dx < 0) api.next();  // swipe left -> next week
      else api.prev();         // swipe right -> previous week
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);


  return (
    <div className="vb-cal-page" ref={wrapRef}>
      <div className="vb-cal-head">
        <div>
          <h2 className="vb-cal-title">Calendar</h2>
        </div>
      </div>

      <div className="vb-cal-card">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
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
            const r = { startIso: info.start.toISOString(), endIso: info.end.toISOString() };
            setLastRange(r);
            loadAppointments(r.startIso, r.endIso).catch(console.error);
          }}
          editable
          eventDurationEditable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}

        />
      </div>

      {/* Non-annoying Save Bar */}
      {changeCount > 0 && (
        <div className="vb-savebar">
          <div className="vb-savebar-left">
            {changeCount} unsaved change{changeCount > 1 ? "s" : ""}
          </div>

          <div className="vb-savebar-right">
            <button className="vb-btn" onClick={cancelAllChanges} type="button">
              Cancel
            </button>
            <button className="vb-btn vb-btn-primary" onClick={() => setShowDoneConfirm(true)} type="button">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Done confirmation (ONE popup only) */}
      {showDoneConfirm && (
        <div className="vb-modal-overlay" onClick={() => setShowDoneConfirm(false)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm changes</h3>

            <div className="vb-modal-meta">
              You’re about to update {changeCount} appointment{changeCount > 1 ? "s" : ""}.
            </div>

            <div className="vb-modal-actions">
              <button className="vb-btn" onClick={() => setShowDoneConfirm(false)} type="button">
                Back
              </button>
              <button className="vb-btn vb-btn-primary" onClick={saveAllChanges} type="button">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create appointment modal */}
      {isOpen && (
        <div className="vb-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New appointment</h3>

            <div className="vb-modal-meta">
              {selectedStart} → {selectedEnd}
            </div>

            <label className="vb-field-label">Customer</label>
            <select className="vb-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>

            <div className="vb-spacer-12" />

            <label className="vb-field-label">Notes</label>
            <textarea className="vb-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="vb-modal-actions">
              <button className="vb-btn" onClick={() => setIsOpen(false)} type="button">
                Cancel
              </button>
              <button className="vb-btn vb-btn-primary" onClick={createAppointment} type="button">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit appointment modal */}
      {editing && (
        <div className="vb-modal-overlay" onClick={() => setEditing(null)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit appointment</h3>

            <label className="vb-field-label">Notes</label>
            <textarea className="vb-textarea" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />

            <div className="vb-modal-split">
              <div className="vb-modal-left">
                {!confirmDelete ? (
                  <button className="vb-btn vb-btn-danger" onClick={() => setConfirmDelete(true)} type="button">
                    Delete
                  </button>
                ) : (
                  <>
                    <button className="vb-btn" onClick={() => setConfirmDelete(false)} type="button">
                      Cancel delete
                    </button>
                    <button className="vb-btn vb-btn-danger" onClick={deleteAppointment} type="button">
                      Confirm delete
                    </button>
                  </>
                )}
              </div>

              <div className="vb-modal-right">
                <button className="vb-btn" onClick={() => setEditing(null)} type="button">
                  Close
                </button>
                <button className="vb-btn vb-btn-primary" onClick={saveNotesOnly} type="button">
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

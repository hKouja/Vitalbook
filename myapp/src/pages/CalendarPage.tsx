import { useEffect, useMemo, useState, useRef } from "react";
import type { ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventInput } from "@fullcalendar/core";
import { authHeader } from "../api/http";
import "../css/calendarPage.css";
import { API_BASE } from "../api";

import { useOutletContext, useLocation } from "react-router-dom";

import close1 from "../assets/icons/close1.png";
import close2 from "../assets/icons/close2.png";
import pen1 from "../assets/icons/pen1.png";
import pen2 from "../assets/icons/pen2.png";
import bin1 from "../assets/icons/bin1.png";
import bin2 from "../assets/icons/bin2.png";

const API_URL = `${API_BASE}/api`; 

type Customer = {
   id: string;
   full_name: string;
   phone_number: string;
   security_number?: string;
   color?: string;
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
   customer_id: string;
   full_name: string;
   phone_number: string;
   security_number?: string;
   start?: string;
   end?: string;
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
type ThemeIconProps = {
  isDark: boolean;
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
};

type LayoutContext = {
  isDark: boolean;
  ThemeIcon: ComponentType<ThemeIconProps>;
};
type CalendarLocationState = {
  focusAppointmentId?: string;
  focusDate?: string;
};



export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as CalendarLocationState | null) ?? null;
  const pendingFocusRef = useRef<string | null>(navState?.focusDate ?? null);
  const hasAppliedFocusRef = useRef(false);
  
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
  const [showEditNotes, setShowEditNotes] = useState(false);
  
  const [stagedCreates, setStagedCreates] = useState<Record<string, StagedCreate>>({});
  const [stagedChanges, setStagedChanges] = useState<Record<string, Change>>({});
  const [showDoneConfirm, setShowDoneConfirm] = useState(false);
  const [lastRange, setLastRange] = useState<{ startIso: string; endIso: string } | null>(null);
  
  const changeCount = Object.keys(stagedChanges).length + Object.keys(stagedCreates).length;

  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);

  const { isDark, ThemeIcon } = useOutletContext<LayoutContext>();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workStart, setWorkStart] = useState("06:00");
  const [workEnd, setWorkEnd] = useState("22:00");
  const [visibleDays, setVisibleDays] = useState<number[]>([1,2,3,4,5,6]);

  const [draftWorkStart, setDraftWorkStart] = useState(workStart);
  const [draftWorkEnd, setDraftWorkEnd] = useState(workEnd);
  const [draftVisibleDays, setDraftVisibleDays] = useState<number[]>(visibleDays);

  const lastRangeRef = useRef<{ startIso: string; endIso: string } | null>(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);

    return customers
      .filter((c) => {
        const name = c.full_name.toLowerCase();
        const phone = (c.phone_number || "").toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
      .slice(0, 20);
  }, [customers, customerQuery]);

  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    side: "left" | "right";
  } | null>(null);

  const [isClosingPanel, setIsClosingPanel] = useState(false);

  function chooseCustomer(c: Customer) {
    setCustomerId(c.id);
    setCustomerQuery(c.full_name);
    setCustomerMenuOpen(false);
  }

  function getCurrentViewLabel() {
    const viewType = calRef.current?.getApi().view.type;

    if (viewType === "timeGridDay") return "Day";
    if (viewType === "timeGridWeek") return "Week";
    if (viewType === "dayGridMonth") return "Month";
    return "View";
  }

  function changeCalendarView(view: "timeGridDay" | "timeGridWeek" | "dayGridMonth") {
    const api = calRef.current?.getApi();
    if (!api) return;

    api.changeView(view);
    setViewMenuOpen(false);
  }

  function getPanelPositionFromRect(rect: DOMRect) {
    const panelWidth = 420;
    const gap = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const canOpenLeft = rect.left >= panelWidth + gap;
    const side: "left" | "right" = canOpenLeft ? "left" : "right";

    let left = canOpenLeft
      ? rect.left - panelWidth - gap
      : rect.right + gap;

    const maxLeft = viewportWidth - panelWidth - 12;
    left = Math.max(12, Math.min(left, maxLeft));

    let top = rect.top;
    const estimatedPanelHeight = 340;
    const maxTop = viewportHeight - estimatedPanelHeight - 12;
    top = Math.max(12, Math.min(top, maxTop));

    return { top, left, side };
  }

  function closeSidePanel(afterClose?: () => void) {
    setIsClosingPanel(true);

    setTimeout(() => {
      setIsClosingPanel(false);
      setPanelPos(null);
      afterClose?.();
    }, 180);
  }

  function closeCreatePanel() {
    closeSidePanel(() => {
      setIsOpen(false);
      setCustomerId("");
      setNotes("");
    });
  }

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

  useEffect(() => {
    const raw = localStorage.getItem("vb_calendar_settings");
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s.workStart) setWorkStart(s.workStart);
      if (s.workEnd) setWorkEnd(s.workEnd);
      if (Array.isArray(s.visibleDays)) setVisibleDays(s.visibleDays);
    } catch {}
  }, []);

  useEffect(() => {
    if (!lastRange) return;

    const prev = lastRangeRef.current;
    if (prev && prev.startIso === lastRange.startIso && prev.endIso === lastRange.endIso) return;

    lastRangeRef.current = lastRange;
    loadAppointments(lastRange.startIso, lastRange.endIso).catch(console.error);
  }, [lastRange]);

  useEffect(() => {
    pendingFocusRef.current = navState?.focusDate ?? null;
    hasAppliedFocusRef.current = false;
  }, [navState?.focusDate]);

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

  const SLOT_MIN = 15;

  function handleSelect(arg: DateSelectArg) {
    const start = arg.start;
    const end = arg.end;

    const diffMin = (end.getTime() - start.getTime()) / 60000;

    if (diffMin === SLOT_MIN) return;

    setSelectedStart(start.toISOString());
    setSelectedEnd(end.toISOString());

    setCustomerId("");
    setNotes("");
    setIsOpen(true);
    setCustomerQuery("");
    setCustomerMenuOpen(false);
  }




  function createAppointment() {
    if (!customerId) return alert("Choose a customer.");

    const c = customers.find((x) => String(x.id) === String(customerId));
    if (!c) return alert("Customer not found.");

    const tempId = `tmp-${Date.now()}`;

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
    closeCreatePanel();
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

      setEditing((prev) =>
        prev ? { ...prev, notes: editNotes } : prev
      );
      setShowEditNotes(false);
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
    const customerId = (info.event.extendedProps?.customer_id ?? "") as string;

    const customer = customers.find((c) => String(c.id) === String(customerId));
    const rect = info.el.getBoundingClientRect();

    setPanelPos(getPanelPositionFromRect(rect));
    setIsClosingPanel(false);

    setEditing({
      id,
      notes,
      customer_id: customerId,
      full_name: customer?.full_name ?? String(info.event.title ?? ""),
      phone_number: customer?.phone_number ?? "",
      security_number: customer?.security_number ?? "",
      start: info.event.start ? info.event.start.toISOString() : "",
      end: info.event.end ? info.event.end.toISOString() : "",
    });

    setEditNotes(notes);
    setConfirmDelete(false);
    setShowEditNotes(false);
  }

  function handleDateClick(info: any) {
    if (info.view?.type === "dayGridMonth") {
      info.view.calendar.changeView("timeGridDay", info.date);
      return;
    }

    const clicked = info.date as Date;

    const hourStart = new Date(clicked);
    hourStart.setMinutes(0, 0, 0);

    const hourEnd = new Date(hourStart.getTime() + 60 * 60000);

    info.view.calendar.select(hourStart, hourEnd);

    let rect: DOMRect;

    if (info.view?.type === "timeGridDay" && info.jsEvent) {
      rect = new DOMRect(
        info.jsEvent.clientX,
        info.jsEvent.clientY,
        1,
        1
      );
    } else {
      rect =
        info.dayEl?.getBoundingClientRect?.() ??
        new DOMRect(
          info.jsEvent?.clientX ?? 100,
          info.jsEvent?.clientY ?? 100,
          1,
          1
        );
    }

    setPanelPos(getPanelPositionFromRect(rect));
    setIsClosingPanel(false);

    setSelectedStart(hourStart.toISOString());
    setSelectedEnd(hourEnd.toISOString());
    setCustomerId("");
    setNotes("");
    setIsOpen(true);
    setCustomerQuery("");
    setCustomerMenuOpen(false);
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

  const fmtWeekday = useMemo(
    () => new Intl.DateTimeFormat("en-US", { weekday: "short" }),
    []
  );

  return (
    <div className="vb-cal-page" ref={wrapRef}>
      <div className="vb-cal-head">
        <div className="vb-view-picker">
          <button
            className="vb-btn"
            type="button"
            onClick={() => setViewMenuOpen((prev) => !prev)}
          >
            {getCurrentViewLabel()} ▾
          </button>

          {viewMenuOpen && (
            <div className="vb-view-menu">
              <button
                className="vb-view-menu-item"
                type="button"
                onClick={() => changeCalendarView("timeGridDay")}
              >
                Day
              </button>

              <button
                className="vb-view-menu-item"
                type="button"
                onClick={() => changeCalendarView("timeGridWeek")}
              >
                Week
              </button>

              <button
                className="vb-view-menu-item"
                type="button"
                onClick={() => changeCalendarView("dayGridMonth")}
              >
                Month
              </button>
            </div>
          )}
        </div>
        <div>
          <h2 className="vb-cal-title">Calendar</h2>
        </div>
        <button
          className="vb-btn"
          type="button"
          onClick={() => {
            setDraftWorkStart(workStart);
            setDraftWorkEnd(workEnd);
            setDraftVisibleDays(visibleDays);
            setSettingsOpen(true);
          }}
        >
          Working hours
        </button>

      </div>

      <div className="vb-cal-card">
        <FullCalendar
          allDaySlot={false}
          forceEventDuration={true}
          firstDay={1}
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotLabelInterval="01:00"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          selectable
          dateClick={handleDateClick}
          select={handleSelect}
          height="auto"
          nowIndicator
          slotMinTime={`${workStart}:00`}
          slotMaxTime={`${workEnd}:00`}
          events={events}
          datesSet={(info) => {
            const r = { startIso: info.start.toISOString(), endIso: info.end.toISOString() };

            setLastRange((prev) => {
                if (prev && prev.startIso === r.startIso && prev.endIso === r.endIso) return prev;
                return r;
            });

            if (hasAppliedFocusRef.current) return;

            const focusDate = pendingFocusRef.current;
            if (!focusDate) return;

            const targetDate = new Date(focusDate);
            if (Number.isNaN(targetDate.getTime())) return;

            const currentStart = info.start.getTime();
            const currentEnd = info.end.getTime();
            const targetTime = targetDate.getTime();

            // Only jump if target date is outside the currently shown range
            if (targetTime < currentStart || targetTime >= currentEnd) {
                hasAppliedFocusRef.current = true;
                info.view.calendar.gotoDate(targetDate);

                navigate(location.pathname, { replace: true, state: null });
                pendingFocusRef.current = null;
                return;
            }

            hasAppliedFocusRef.current = true;
            navigate(location.pathname, { replace: true, state: null });
            pendingFocusRef.current = null;
          }}

          editable
          eventDurationEditable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}

          dayHeaderContent={(args) => {
            const weekday = new Intl.DateTimeFormat(undefined, {
              weekday: "short",
            }).format(args.date).toUpperCase();

            if (args.view.type === "dayGridMonth") {
              return <div className="vb-month-head">{weekday}</div>;
            }

            if (args.view.type === "timeGridDay") {
              return (
                <div className="vb-dayhead-single">
                  <span className="vb-dayname">{weekday}</span>
                  <span className={`vb-daynum ${args.isToday ? "is-today" : ""}`}>
                    {args.date.getDate()}
                  </span>
                </div>
              );
            }

            return (
              <div className="vb-dayhead">
                <div className="vb-dayname">{weekday}</div>
                <div className={`vb-daynum ${args.isToday ? "is-today" : ""}`}>
                  {args.date.getDate()}
                </div>
              </div>
            );
          }}

          /* hide days not selected */
          hiddenDays={[0,1,2,3,4,5,6].filter(d => !visibleDays.includes(d))}

          businessHours={{
            daysOfWeek: visibleDays,
            startTime: workStart,
            endTime: workEnd,
          }}
          selectConstraint="businessHours"
          eventConstraint="businessHours" 

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
        <div className="vb-edit-overlay" onClick={closeCreatePanel}>
          <div
            className={`vb-edit-panel ${
              panelPos?.side === "left" ? "is-left" : "is-right"
            } ${isClosingPanel ? "is-closing" : ""}`}
            style={{
              top: panelPos?.top ?? 80,
              left: panelPos?.left ?? 80,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vb-appt-topbar">
              <h3 className="vb-appt-title">New appointment</h3>
              <div className="vb-appt-action">
                <button
                  className="vb-icon-btn"
                  type="button"
                  onClick={closeCreatePanel}
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="vb-appt-header">
              <div className="vb-appt-time">
                {selectedStart && selectedEnd
                  ? `${new Date(selectedStart).toLocaleDateString()} · ${new Date(
                      selectedStart
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} – ${new Date(selectedEnd).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </div>
            </div>

            <label className="vb-field-label">Customer</label>

              <div className="vb-customer-picker">
                <input
                  className="vb-input"
                  type="text"
                  value={customerQuery}
                  placeholder="Search by name or phone..."
                  onFocus={() => setCustomerMenuOpen(true)}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setCustomerId("");
                    setCustomerMenuOpen(true);
                  }}
                />

                {customerMenuOpen && (
                  <div className="vb-customer-menu">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="vb-customer-option"
                          onClick={() => chooseCustomer(c)}
                        >
                          <span className="vb-customer-name">{c.full_name}</span>
                          <span className="vb-customer-phone">{c.phone_number || "No phone"}</span>
                        </button>
                      ))
                    ) : (
                      <div className="vb-customer-empty">No matching customers</div>
                    )}
                  </div>
                )}
              </div>

            <div className="vb-spacer-12" />

            <label className="vb-field-label">Notes</label>
            <textarea
              className="vb-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="vb-modal-actions">
              <button className="vb-btn" onClick={closeCreatePanel} type="button">
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
        <div
          className="vb-edit-overlay"
          onClick={() =>
            closeSidePanel(() => {
              setEditing(null);
              setConfirmDelete(false);
              setShowEditNotes(false);
            })
          }
        >
          <div
            className={`vb-edit-panel ${
              panelPos?.side === "left" ? "is-left" : "is-right"
            } ${isClosingPanel ? "is-closing" : ""}`}
            style={{
              top: panelPos?.top ?? 80,
              left: panelPos?.left ?? 80,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!confirmDelete && (
              <>
                <div className="vb-appt-topbar">
                  <h3 className="vb-appt-title">{editing.full_name || "Unnamed patient"}</h3>
                  <div className="vb-appt-action">
                    <button
                      className="vb-icon-btn"
                      type="button"
                      onClick={() => setShowEditNotes(true)}
                      aria-label="Add note"
                      title="Add note"
                    >
                      <ThemeIcon
                        isDark={isDark}
                        lightSrc={pen1}
                        darkSrc={pen2}
                        alt="Edit"
                        className="vb-icon-btn-img"
                      />
                    </button>

                    <button
                      className="vb-icon-btn"
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      aria-label="Delete appointment"
                      title="Delete appointment"
                    >
                      <ThemeIcon
                        isDark={isDark}
                        lightSrc={bin1}
                        darkSrc={bin2}
                        alt="Edit"
                        className="vb-icon-btn-img"
                      />
                    </button>

                    <button
                      className="vb-icon-btn"
                      type="button"
                      onClick={() =>
                        closeSidePanel(() => {
                          setEditing(null);
                          setConfirmDelete(false);
                          setShowEditNotes(false);
                        })
                      }
                      aria-label="Close"
                      title="Close"
                    >
                      <ThemeIcon
                        isDark={isDark}
                        lightSrc={close1}
                        darkSrc={close2}
                        alt="Edit"
                        className="vb-icon-btn-img"
                      />
                    </button>
                  </div>
                </div>

                <div className="vb-appt-header">
                  <div className="vb-appt-time">
                    {editing.start && editing.end
                      ? `${new Date(editing.start).toLocaleDateString()} · ${new Date(
                          editing.start
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} – ${new Date(editing.end).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </div>
                </div>

                <div className="vb-appt-details">
                  <div className="vb-appt-line">
                    <span className="vb-appt-detail-label">Phone:</span>
                    <span>{editing.phone_number || "—"}</span>
                  </div>

                  <div className="vb-appt-line">
                    <span className="vb-appt-detail-label">Security number:</span>
                    <span>{editing.security_number || "—"}</span>
                  </div>

                  <div className="vb-appt-line">
                    <span className="vb-appt-detail-label">Notes:</span>
                    <span>{editing.notes?.trim() ? editing.notes : "—"}</span>
                  </div>
                </div>

                {showEditNotes && (
                  <div className="vb-edit-notes-wrap">
                    <label className="vb-field-label">Add note</label>
                    <textarea
                      className="vb-textarea"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />

                    <div className="vb-modal-actions">
                      <button
                        className="vb-btn"
                        type="button"
                        onClick={() => {
                          setShowEditNotes(false);
                          setEditNotes(editing.notes ?? "");
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        className="vb-btn vb-btn-primary"
                        type="button"
                        onClick={saveNotesOnly}
                      >
                        Save notes
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {confirmDelete ? (
              <div className="vb-modal-actions">
                <button
                  className="vb-btn"
                  onClick={() => setConfirmDelete(false)}
                  type="button"
                >
                  Cancel deletion
                </button>
                <button
                  className="vb-btn vb-btn-danger"
                  onClick={deleteAppointment}
                  type="button"
                >
                  Confirm delete
                </button>
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="vb-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Working hours</h3>

            <label className="vb-field-label">Start</label>
            <input
              className="vb-input"
              type="time"
              value={draftWorkStart} onChange={(e) => setDraftWorkStart(e.target.value)}
            />

            <div className="vb-spacer-12" />

            <label className="vb-field-label">End</label>
            <input
              className="vb-input"
              type="time"
              value={draftWorkEnd} onChange={(e) => setDraftWorkEnd(e.target.value)}
            />

            <div className="vb-spacer-12" />

            <label className="vb-field-label">Show days</label>
            <div className="vb-days">
              {[
                { n: 1, t: "Mon" },
                { n: 2, t: "Tue" },
                { n: 3, t: "Wed" },
                { n: 4, t: "Thu" },
                { n: 5, t: "Fri" },
                { n: 6, t: "Sat" },
                { n: 0, t: "Sun" },
              ].map((d) => (
                <label key={d.n} className="vb-daycheck">
                  <input
                    type="checkbox"
                    checked={draftVisibleDays.includes(d.n)}
                    onChange={(e) => {
                      setDraftVisibleDays((prev) =>
                        e.target.checked ? [...prev, d.n] : prev.filter((x) => x !== d.n)
                      );
                    }}
                  />
                  <span>{d.t}</span>
                </label>
              ))}
            </div>

            <div className="vb-modal-actions">
              <button
                className="vb-btn"
                type="button"
                onClick={() => {setSettingsOpen(false);}}
              >
                Cancel
              </button>
              <button
                className="vb-btn vb-btn-primary"
                type="button"
                onClick={() => {
                  setWorkStart(draftWorkStart);
                  setWorkEnd(draftWorkEnd);
                  setVisibleDays(draftVisibleDays);

                  localStorage.setItem(
                    "vb_calendar_settings",
                    JSON.stringify({
                      workStart: draftWorkStart,
                      workEnd: draftWorkEnd,
                      visibleDays: draftVisibleDays,
                    })
                  );
                  setSettingsOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

}

export async function exportPdf(trip) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;
  const text = (value, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(value), 170);
    for (const line of lines) {
      if (y > 277) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += size * 0.45 + 2;
    }
  };
  text("WAYFARE", 24);
  text(trip.destination, 18);
  text(
    `${trip.startDate} to ${trip.endDate} | ${trip.travellers} traveller(s)`,
  );
  text(
    `Total group budget: ${Number(trip.budget).toFixed(trip.currency === "JPY" ? 0 : 2)} ${trip.currency || "INR"}`,
  );
  text("");
  for (const d of trip.days) {
    text(`${d.label}: ${d.title}`, 14);
    const acts = Array.isArray(d.activities)
      ? d.activities
      : [{ title: d.activities || d.title }];
    for (const a of acts) {
      text(`- ${a.title}`);
      if (a.notes) text(a.notes);
      if (a.location)
        text(
          `Location: ${a.location.name} (${a.location.lat}, ${a.location.lon})`,
        );
    }
    text("");
  }
  text("Packing checklist", 14);
  for (const i of trip.packing || [])
    text(`${i.checked ? "[x]" : "[ ]"} ${i.label}`);
  text("Confirm opening times, routes, and prices before booking.");
  doc.save(`Wayfare-${trip.id}.pdf`);
}
const escape = (v) =>
  String(v)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
export function calendarText(trip, hours) {
  const end = new Date(`${trip.endDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayfare//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${trip.id}@wayfare`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${trip.startDate.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, "")}`,
    `SUMMARY:${escape("Wayfare trip: " + trip.destination)}`,
    `DESCRIPTION:${escape("Review your itinerary and packing checklist before departure.")}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${hours}H`,
    "ACTION:DISPLAY",
    "DESCRIPTION:Prepare for your Wayfare trip",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function exportCalendar(trip, hours) {
  const url = URL.createObjectURL(
    new Blob([calendarText(trip, hours)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `Wayfare-${trip.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

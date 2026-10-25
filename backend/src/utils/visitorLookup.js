import Visitor from "../models/Visitor.js";

export function findVisitorByIdOrCode(value) {
  return Visitor.findOne({ $or: [{ id: value }, { passcode: value }, { qrToken: value }] });
}

export function isWithinVisitDates(visitor, date = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return Boolean(visitor.arrivalDate && visitor.exitDate && today >= visitor.arrivalDate && today <= visitor.exitDate);
}

export function timeLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
}

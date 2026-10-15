import Visitor from "../models/Visitor.js";

export function findVisitorByIdOrCode(value) {
  return Visitor.findOne({ $or: [{ id: value }, { passcode: value }] });
}

export function isWithinVisitDates(visitor, date = new Date()) {
  const today = date.toISOString().slice(0, 10);
  return Boolean(visitor.arrivalDate && visitor.exitDate && today >= visitor.arrivalDate && today <= visitor.exitDate);
}

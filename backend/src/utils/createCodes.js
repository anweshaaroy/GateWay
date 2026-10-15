import { randomInt } from "node:crypto";
import Visitor from "../models/Visitor.js";

export async function createUniquePasscode() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const passcode = String(randomInt(1000, 10000));
    if (!(await Visitor.exists({ passcode }))) return passcode;
  }
  throw new Error("Could not allocate a unique passcode. Please try again.");
}

export async function createUniqueVisitorId() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const id = `VIS-${randomInt(100000, 1000000)}`;
    if (!(await Visitor.exists({ id }))) return id;
  }
  throw new Error("Could not allocate a unique visitor ID. Please try again.");
}

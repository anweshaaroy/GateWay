import { randomBytes, randomInt } from "node:crypto";
import Visitor from "../models/Visitor.js";

async function uniqueValue(makeValue, queryField) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const value = makeValue();
    if (!(await Visitor.exists({ [queryField]: value }))) return value;
  }
  throw new Error(`Could not allocate unique ${queryField}. Please try again.`);
}

export const createUniquePasscode = () => uniqueValue(() => String(randomInt(1000, 10000)), "passcode");
export const createUniqueVisitorId = () => uniqueValue(() => `VIS-${randomInt(100000, 1000000)}`, "id");
export const createQrToken = () => randomBytes(32).toString("hex");

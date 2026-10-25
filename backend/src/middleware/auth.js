import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw httpError(401, "Sign in with Google to access this resource.");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, "Session token is invalid or expired. Please sign in again.");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw httpError(401, "Account is unavailable.");
  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(httpError(403, "You do not have permission to perform this action."));
    next();
  };
}

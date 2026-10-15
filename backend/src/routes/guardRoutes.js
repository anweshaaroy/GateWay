import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { verifyPass, checkInVisitor, checkOutVisitor, searchVisitors, exportAuditCsv } from "../controllers/guardController.js";

const router = Router();
router.use(protect, authorize("guard", "admin"));
router.get("/search", searchVisitors);
router.get("/audit.csv", exportAuditCsv);
router.get("/verify/:passcode", verifyPass);
router.post("/check-in/:id", checkInVisitor);
router.post("/check-out/:id", checkOutVisitor);
export default router;

import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { verifyPass, checkInVisitor, checkOutVisitor, searchVisitors, exportAuditCsv, listGuardVisitors, createWalkInVisitor } from "../controllers/guardController.js";
import { visitorUpload } from "../middleware/upload.js";

const router = Router();
router.use(protect, authorize("guard", "admin"));
router.get("/visitors", listGuardVisitors);
router.get("/search", searchVisitors);
router.post("/walk-in", visitorUpload, createWalkInVisitor);
router.get("/audit.csv", exportAuditCsv);
router.get("/verify/:passcode", verifyPass);
router.post("/check-in/:id", checkInVisitor);
router.post("/check-out/:id", checkOutVisitor);
export default router;

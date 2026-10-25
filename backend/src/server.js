import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 random characters.");
    await connectDB();
    const server = app.listen(port, () => console.log(`GateWay Express API listening at http://localhost:${port}`));
    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down GateWay API...`);
      server.close(() => process.exit(0));
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start GateWay API:", error.message);
    process.exit(1);
  }
}

start();

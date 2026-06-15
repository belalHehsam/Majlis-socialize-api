import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { connectDB } from "./config/database";
import { initSocket } from "./socket";

const PORT = process.env.PORT;

const server = createServer(app);

initSocket(server);

// Start server only after DB connects
connectDB()
  .then(() => {
    server.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Exiting so the process manager can retry.`);
        process.exit(1);
      }
      throw err;
    });
  })
  .catch((err: Error) => {
    console.error(" Failed to connect to database:", err.message);
    process.exit(1);
  });


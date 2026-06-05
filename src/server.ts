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
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  })
  .catch((err: Error) => {
    console.error(" Failed to connect to database:", err.message);
    process.exit(1);
  });

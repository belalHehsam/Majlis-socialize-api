import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/database";

const PORT = process.env.PORT ?? 5000;

// Start server only after DB connects
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  })
  .catch((err: Error) => {
    console.error(" Failed to connect to database:", err.message);
    process.exit(1);
  });

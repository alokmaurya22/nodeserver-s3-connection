import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "200kb" }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Twynup S3 backend running",
    env: process.env.NODE_ENV || "development"
  });
});

app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

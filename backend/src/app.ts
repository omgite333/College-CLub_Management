import cors from "cors";
import express, { Request, Response } from "express";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import clubsRoutes from "./routes/clubs";
import classroomsRoutes from "./routes/classrooms";
import bookingsRoutes from "./routes/bookings";
import healthRoutes from "./routes/health";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/classrooms", classroomsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/health", healthRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;

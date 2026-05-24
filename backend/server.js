const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const reminderRoutes = require("./routes/reminderRoutes");

const app = express();

app.use(cors({ origin: "https://amazon-reminder.vercel.app/" }));
app.use(express.json());

// Routes
app.use("/api/reminders", reminderRoutes);

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "OK", message: "Amazon Reminder API running" }),
);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

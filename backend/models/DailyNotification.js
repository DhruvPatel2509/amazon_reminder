const mongoose = require("mongoose");

const dailyNotificationSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
    },
    slot: {
      type: String,
      enum: ["08:00", "15:30", "21:00"],
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

dailyNotificationSchema.index({ dateKey: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model("DailyNotification", dailyNotificationSchema);

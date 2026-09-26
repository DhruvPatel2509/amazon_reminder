const mongoose = require("mongoose");

const dailyNotificationSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DailyNotification", dailyNotificationSchema);

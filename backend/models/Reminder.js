const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, "Order ID is required"],
      trim: true,
    },
    orderDate: {
      type: Date,
      required: [true, "Order date is required"],
    },
    amazonLink: {
      type: String,
      trim: true,
      default: "",
    },
    productImage: {
      type: String,
      trim: true,
      default: "",
    },
    reviewDate: {
      type: Date,
      default: null,
    },
    refundDate: {
      type: Date,
      default: null,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    originalAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    less: {
      type: Number,
      default: null,
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: null,
    },
    orderGroup: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["review", "refundForm", "refund"],
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "overdue"],
      default: "upcoming",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Auto-compute status before save
reminderSchema.pre("save", function (next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = this.type === "review" ? this.reviewDate : this.refundDate;

  if (!targetDate) return next();

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  if (this.status !== "completed") {
    if (target < today) {
      this.status = "overdue";
    } else {
      this.status = "upcoming";
    }
  }
  next();
});

module.exports = mongoose.model("Reminder", reminderSchema);

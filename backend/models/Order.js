const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true },
    amazonLink: { type: String, trim: true, default: "" },
    productImage: { type: String, trim: true, default: "" },
    refundDate: { type: Date, default: null },
    originalAmount: { type: Number, default: null, min: 0 },
    refundAmount: { type: Number, default: null, min: 0 },
    orderGroup: { type: String, trim: true, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "refunded", "failed"],
      default: "open",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);

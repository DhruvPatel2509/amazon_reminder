const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true },
    reviewDate: { type: Date, default: null },
    amazonLink: { type: String, trim: true, default: "" },
    productImage: { type: String, trim: true, default: "" },
    productName: { type: String, trim: true, default: "" },
    refundFormDate: { type: Date, default: null },
    refundDate: { type: Date, default: null },
    contactPerson: { type: String, trim: true, default: "" },
    originalAmount: { type: Number, default: null, min: 0 },
    less: { type: Number, default: null, min: 0 },
    refundAmount: { type: Number, default: null, min: 0 },
    refundStatus: {
      type: String,
      enum: ["pending", "credited", "cancelled"],
      default: "pending",
    },
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

// Auto-compute less field before save
orderSchema.pre("save", function (next) {
  // Auto-calculate less = originalAmount - refundAmount
  if (
    this.originalAmount != null &&
    this.refundAmount != null &&
    !isNaN(this.originalAmount) &&
    !isNaN(this.refundAmount)
  ) {
    this.less = Number(this.originalAmount) - Number(this.refundAmount);
    if (this.less < 0) this.less = 0;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);

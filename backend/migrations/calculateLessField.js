const mongoose = require("mongoose");
const Reminder = require("../models/Reminder");
const Order = require("../models/Order");

async function calculateLessField() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/amazon-reminders",
    );

    console.log("Starting migration: Calculating less field...");

    // Update Reminders
    const reminders = await Reminder.find({
      $and: [
        { originalAmount: { $ne: null } },
        { refundAmount: { $ne: null } },
      ],
    });

    console.log(`Found ${reminders.length} reminders to update`);

    let remindersUpdated = 0;
    for (const reminder of reminders) {
      const calculatedLess =
        Number(reminder.originalAmount) - Number(reminder.refundAmount);
      if (calculatedLess !== reminder.less) {
        reminder.less = calculatedLess > 0 ? calculatedLess : 0;
        await reminder.save();
        remindersUpdated++;
      }
    }

    console.log(`✅ Reminders: Updated ${remindersUpdated} records`);

    // Update Orders
    const orders = await Order.find({
      $and: [
        { originalAmount: { $ne: null } },
        { refundAmount: { $ne: null } },
      ],
    });

    console.log(`Found ${orders.length} orders to update`);

    let ordersUpdated = 0;
    for (const order of orders) {
      const calculatedLess =
        Number(order.originalAmount) - Number(order.refundAmount);
      if (calculatedLess !== order.less) {
        order.less = calculatedLess > 0 ? calculatedLess : 0;
        await order.save();
        ordersUpdated++;
      }
    }

    console.log(`✅ Orders: Updated ${ordersUpdated} records`);
    console.log(
      `\n✅ Migration complete! Total: ${remindersUpdated + ordersUpdated} records updated`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

calculateLessField();

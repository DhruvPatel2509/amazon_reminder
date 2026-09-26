const crypto = require("crypto");
const Order = require("../models/Order");
const DailyNotification = require("../models/DailyNotification");
const sendTelegramMessage = require("../utils/telegram");

const TIME_ZONE = "Asia/Kolkata";

function getKolkataDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(dateKey, targetDateKey) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const target = new Date(`${targetDateKey}T00:00:00Z`);
  return Math.round((date - target) / 86_400_000);
}

function reminderTypeLabel(reminder) {
  return reminder.type === "review" ? "Review" : "Refund";
}

function getTargetDate(reminder) {
  if (reminder.type === "review") return reminder.reviewDate;
  if (reminder.type === "refundForm") {
    return reminder.refundFormDate || reminder.refundDate;
  }
  return reminder.refundDate;
}

function orderToReminders(order) {
  const base = {
    amazonLink: order.amazonLink,
    productName: order.productName,
    contactPerson: order.contactPerson,
  };

  return [
    {
      ...base,
      type: "review",
      reviewDate: order.reviewDate,
      completed: order.reviewStatus === "completed",
    },
    {
      ...base,
      type: "refundForm",
      refundFormDate: order.refundFormDate,
      refundDate: order.refundFormDate,
      completed: order.refundFormStatus === "completed",
    },
    {
      ...base,
      type: "refund",
      refundDate: order.refundDate,
      completed: order.refundStatus === "credited",
    },
  ].filter((reminder) => getTargetDate(reminder));
}

function formatReminder(reminder, dateKey, overdue = false) {
  const targetDate = getTargetDate(reminder);
  const lines = [
    `• Product: ${reminder.productName || "Product name unavailable"}`,
  ];

  if (overdue) {
    const days = daysBetween(dateKey, getKolkataDateKey(targetDate));
    lines.push(`${reminderTypeLabel(reminder)} overdue by ${days} day${days === 1 ? "" : "s"}`);
  } else {
    lines.push(`${reminderTypeLabel(reminder)}: Today`);
  }

  if (reminder.type !== "review" && reminder.contactPerson) {
    lines.push(`Contact: ${reminder.contactPerson}`);
  }

  lines.push(`Link: ${reminder.amazonLink || "Link unavailable"}`);
  return lines.join("\n");
}

function buildSummary(todayReminders, overdueReminders, dateKey) {
  const reviewToday = todayReminders.filter((reminder) => reminder.type === "review");
  const refundToday = todayReminders.filter((reminder) => reminder.type !== "review");
  const sections = ["🔔 Today's Amazon Reminders"];

  if (reviewToday.length) {
    sections.push(`📝 REVIEW\n${reviewToday.map((reminder) => formatReminder(reminder, dateKey)).join("\n\n")}`);
  }
  if (refundToday.length) {
    sections.push(`💰 REFUND\n${refundToday.map((reminder) => formatReminder(reminder, dateKey)).join("\n\n")}`);
  }
  if (overdueReminders.length) {
    sections.push(`⚠️ OVERDUE\n${overdueReminders.map((reminder) => formatReminder(reminder, dateKey, true)).join("\n\n")}`);
  }

  return sections.join("\n\n");
}

function isAuthorized(req) {
  const secret = process.env.REMINDER_CRON_SECRET;
  const authorization = req.get("authorization") || "";
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!secret || !suppliedSecret) return false;

  const expected = Buffer.from(secret);
  const received = Buffer.from(suppliedSecret);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

exports.sendDailyReminder = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const dateKey = getKolkataDateKey();

  try {
    const existingNotification = await DailyNotification.findOne({ dateKey });
    if (existingNotification) {
      return res.json({ success: true, message: "Daily reminder already sent", dateKey });
    }

    const orders = await Order.find({});
    const reminders = orders.flatMap(orderToReminders);
    const todayReminders = [];
    const overdueReminders = [];

    for (const reminder of reminders) {
      if (reminder.completed) continue;

      const targetDateKey = getKolkataDateKey(getTargetDate(reminder));
      if (targetDateKey === dateKey) todayReminders.push(reminder);
      else if (targetDateKey < dateKey) overdueReminders.push(reminder);
    }

    if (!todayReminders.length && !overdueReminders.length) {
      return res.json({ success: true, message: "No reminders due today", dateKey });
    }

    try {
      await DailyNotification.create({ dateKey });
    } catch (error) {
      if (error?.code === 11000) {
        return res.json({ success: true, message: "Daily reminder already sent", dateKey });
      }
      throw error;
    }

    try {
      await sendTelegramMessage(buildSummary(todayReminders, overdueReminders, dateKey));
      await DailyNotification.updateOne({ dateKey }, { sentAt: new Date() });
    } catch (error) {
      await DailyNotification.deleteOne({ dateKey });
      throw error;
    }

    return res.json({
      success: true,
      message: "Daily reminder sent",
      dateKey,
      today: todayReminders.length,
      overdue: overdueReminders.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

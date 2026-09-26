const crypto = require("crypto");
const Order = require("../models/Order");
const DailyNotification = require("../models/DailyNotification");
const sendTelegramMessage = require("../utils/telegram");

const TIME_ZONE = "Asia/Kolkata";
const SLOTS = { "08:00": "8:00 AM", "15:30": "3:30 PM", "21:00": "9:00 PM" };
let notificationIndexSync;

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

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value || "").replace(/[&<>"']/g, (character) => entities[character]);
}

function getTargetDate(reminder) {
  if (reminder.type === "review") return reminder.reviewDate;
  if (reminder.type === "refundForm") return reminder.refundFormDate || reminder.refundDate;
  return reminder.refundDate;
}

function orderToReminders(order) {
  const base = {
    amazonLink: order.amazonLink,
    productName: order.productName,
    contactPerson: order.contactPerson,
  };
  return [
    { ...base, type: "review", reviewDate: order.reviewDate, completed: order.reviewStatus === "completed" },
    {
      ...base,
      type: "refundForm",
      refundFormDate: order.refundFormDate,
      refundDate: order.refundFormDate,
      completed: order.refundFormStatus === "completed",
    },
    { ...base, type: "refund", refundDate: order.refundDate, completed: order.refundStatus === "credited" },
  ].filter((reminder) => getTargetDate(reminder));
}

function formatReminder(reminder, dateKey, { overdue = false, includeContact = true } = {}) {
  const lines = [`• ${escapeHtml(reminder.productName || "Product name unavailable")}`];
  if (overdue) {
    const days = daysBetween(dateKey, getKolkataDateKey(getTargetDate(reminder)));
    lines.push(`⏰ ${days} day${days === 1 ? "" : "s"} overdue`);
  }
  if (includeContact && reminder.type !== "review" && reminder.contactPerson) {
    lines.push(`👤 ${escapeHtml(reminder.contactPerson)}`);
  }
  if (reminder.amazonLink) {
    lines.push(`🔗 <a href="${escapeHtml(reminder.amazonLink)}">Open Product</a>`);
  }
  return lines.join("\n");
}

function buildReminderSection(title, reminders, dateKey, options) {
  if (!reminders.length) return "";
  return `${title}\n${reminders.map((reminder) => formatReminder(reminder, dateKey, options)).join("\n\n")}`;
}

function buildMorningSummary(todayReminders, overdueReminders, dateKey) {
  const reviewToday = todayReminders.filter((reminder) => reminder.type === "review");
  const refundToday = todayReminders.filter((reminder) => reminder.type !== "review");
  const sections = ["🔔 Amazon Reminder | 8:00 AM", `📅 ${dateKey}`];
  const reviewSection = buildReminderSection("📝 REVIEW TODAY", reviewToday, dateKey);
  const refundSection = buildReminderSection("💰 REFUND TODAY", refundToday, dateKey);
  const overdueSection = buildReminderSection("⚠️ OVERDUE", overdueReminders, dateKey, { overdue: true });
  if (reviewSection) sections.push(reviewSection);
  if (refundSection) sections.push(refundSection);
  if (overdueSection) sections.push(overdueSection);
  sections.push(`📌 TODAY: ${reviewToday.length} Reviews | ${refundToday.length} Refunds | ${overdueReminders.length} Overdue`);
  return sections.join("\n\n");
}

function buildAfternoonSummary(todayReminders, overdueReminders, completedToday, dateKey) {
  const sections = ["🔔 Amazon Reminder | 3:30 PM", `📅 ${dateKey}`, "⏳ STILL PENDING"];
  const reviewSection = buildReminderSection("📝 REVIEW", todayReminders.filter((reminder) => reminder.type === "review"), dateKey);
  const refundSection = buildReminderSection("💰 REFUND", todayReminders.filter((reminder) => reminder.type !== "review"), dateKey);
  const overdueSection = buildReminderSection("⚠️ OVERDUE", overdueReminders, dateKey, { overdue: true });
  if (reviewSection) sections.push(reviewSection);
  if (refundSection) sections.push(refundSection);
  if (overdueSection) sections.push(overdueSection);
  sections.push(`✅ Completed today: ${completedToday.length}\n⏳ Remaining: ${todayReminders.length + overdueReminders.length}`);
  return sections.join("\n\n");
}

function productList(reminders) {
  return reminders.map((reminder) => `• ${escapeHtml(reminder.productName || "Product name unavailable")}`).join("\n");
}

function buildFinalSummary(todayReminders, overdueReminders, completedToday, dateKey) {
  if (!todayReminders.length && !overdueReminders.length) {
    return ["🔔 Amazon Reminder | 9:00 PM", `📅 ${dateKey}`, "🎉 All Done!\nNo pending reminders for today."].join("\n\n");
  }
  const sections = ["🔔 Amazon Reminder | 9:00 PM", `📅 ${dateKey}`, "📊 TODAY'S FINAL STATUS"];
  if (completedToday.length) sections.push(`✅ COMPLETED\n${productList(completedToday)}`);
  if (todayReminders.length) sections.push(`⏳ STILL PENDING\n${productList(todayReminders)}`);
  const overdueSection = buildReminderSection("⚠️ OVERDUE", overdueReminders, dateKey, { overdue: true, includeContact: false });
  if (overdueSection) sections.push(overdueSection);
  sections.push(`📌 Summary\n✅ Completed: ${completedToday.length}\n⏳ Pending: ${todayReminders.length}\n⚠️ Overdue: ${overdueReminders.length}`);
  return sections.join("\n\n");
}

function buildSummary(slot, todayReminders, overdueReminders, completedToday, dateKey) {
  if (slot === "08:00") return buildMorningSummary(todayReminders, overdueReminders, dateKey);
  if (slot === "15:30") return buildAfternoonSummary(todayReminders, overdueReminders, completedToday, dateKey);
  return buildFinalSummary(todayReminders, overdueReminders, completedToday, dateKey);
}

function isAuthorized(req) {
  const secret = process.env.REMINDER_CRON_SECRET;
  const authorization = req.get("authorization") || "";
  const suppliedSecret = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!secret || !suppliedSecret) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(suppliedSecret);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function ensureNotificationIndexes() {
  if (!notificationIndexSync) notificationIndexSync = DailyNotification.syncIndexes();
  return notificationIndexSync;
}

exports.sendDailyReminder = async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ success: false, message: "Unauthorized" });

  const slot = req.get("x-reminder-slot");
  if (!SLOTS[slot]) {
    return res.status(400).json({ success: false, message: "A valid X-Reminder-Slot header is required" });
  }

  const dateKey = getKolkataDateKey();
  try {
    await ensureNotificationIndexes();
    const existingNotification = await DailyNotification.findOne({ dateKey, slot });
    if (existingNotification) {
      return res.json({ success: true, message: "Reminder slot already sent", dateKey, slot });
    }

    const todayReminders = [];
    const overdueReminders = [];
    const completedToday = [];
    const orders = await Order.find({});
    for (const reminder of orders.flatMap(orderToReminders)) {
      const targetDateKey = getKolkataDateKey(getTargetDate(reminder));
      if (targetDateKey === dateKey) {
        if (reminder.completed) completedToday.push(reminder);
        else todayReminders.push(reminder);
      } else if (targetDateKey < dateKey && !reminder.completed) {
        overdueReminders.push(reminder);
      }
    }

    try {
      await DailyNotification.create({ dateKey, slot });
    } catch (error) {
      if (error?.code === 11000) {
        return res.json({ success: true, message: "Reminder slot already sent", dateKey, slot });
      }
      throw error;
    }

    try {
      await sendTelegramMessage(
        buildSummary(slot, todayReminders, overdueReminders, completedToday, dateKey),
        { parse_mode: "HTML", disable_web_page_preview: true },
      );
      await DailyNotification.updateOne({ dateKey, slot }, { sentAt: new Date() });
    } catch (error) {
      await DailyNotification.deleteOne({ dateKey, slot });
      throw error;
    }

    return res.json({
      success: true,
      message: `${SLOTS[slot]} reminder sent`,
      dateKey,
      slot,
      today: todayReminders.length,
      completed: completedToday.length,
      overdue: overdueReminders.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

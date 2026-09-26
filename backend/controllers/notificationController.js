const crypto = require("crypto");
const Order = require("../models/Order");
const DailyNotification = require("../models/DailyNotification");
const sendTelegramMessage = require("../utils/telegram");

const TIME_ZONE = "Asia/Kolkata";
const SLOTS = { "08:00": "8:00 AM", "15:30": "3:30 PM", "21:00": "9:00 PM" };
const REMINDER_HEADINGS = {
  review: "\u{1F4DD} REVIEW REMINDER",
  refundForm: "\u{1F4C4} REFUND FORM REMINDER",
  refund: "\u{1F4B0} REFUND REMINDER",
};
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

function decodeHtmlEntities(value) {
  const namedEntities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
  };

  return String(value || "")
    .replace(/&(amp|lt|gt|quot|apos);|&#39;/gi, (entity) => namedEntities[entity.toLowerCase()])
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    });
}

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return decodeHtmlEntities(value).replace(/[&<>"']/g, (character) => entities[character]);
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

function reminderStatus(reminder, dateKey, completed = false) {
  if (completed) return "\u{2705} Completed";

  const days = daysBetween(dateKey, getKolkataDateKey(getTargetDate(reminder)));
  if (days > 0) return `\u{26A0}\u{FE0F} ${days} day${days === 1 ? "" : "s"} overdue`;
  if (days === 0) return "\u{23F0} Due today";
  if (days === -1) return "\u{23F0} Due tomorrow";
  return `\u{23F0} Due in ${Math.abs(days)} days`;
}

function formatReminder(reminder, dateKey, { completed = false } = {}) {
  const lines = [
    REMINDER_HEADINGS[reminder.type],
    `\u{2022} ${escapeHtml(reminder.productName || "Product name unavailable")}`,
    reminderStatus(reminder, dateKey, completed),
  ];
  if (reminder.type !== "review" && reminder.contactPerson) {
    lines.push(`\u{1F464} Contact: ${escapeHtml(reminder.contactPerson)}`);
  }
  if (reminder.amazonLink) {
    lines.push(`\u{1F517} <a href="${escapeHtml(reminder.amazonLink)}">Open Product</a>`);
  }
  return lines.join("\n");
}

function formatReminderList(reminders, dateKey, options) {
  return reminders.map((reminder) => formatReminder(reminder, dateKey, options)).join("\n\n");
}

function buildTypeSummary(reminders) {
  const count = (type) => reminders.filter((reminder) => reminder.type === type).length;
  return [
    "\u{1F4CA} Summary",
    `\u{1F4DD} Review: ${count("review")}`,
    `\u{1F4C4} Refund Form: ${count("refundForm")}`,
    `\u{1F4B0} Refund: ${count("refund")}`,
  ].join("\n");
}

function buildMorningSummary(todayReminders, overdueReminders, dateKey) {
  const reminders = [...todayReminders, ...overdueReminders];
  const sections = ["\u{1F514} Amazon Reminder | 8:00 AM", `\u{1F4C5} ${dateKey}`];
  if (reminders.length) sections.push(formatReminderList(reminders, dateKey));
  sections.push(buildTypeSummary(reminders));
  return sections.join("\n\n");
}

function buildAfternoonSummary(todayReminders, overdueReminders, completedToday, dateKey) {
  const reminders = [...todayReminders, ...overdueReminders];
  const sections = ["\u{1F514} Amazon Reminder | 3:30 PM", `\u{1F4C5} ${dateKey}`];
  if (reminders.length) sections.push(formatReminderList(reminders, dateKey));
  sections.push(`\u{2705} Completed today: ${completedToday.length}\n\u{23F3} Remaining: ${reminders.length}`);
  sections.push(buildTypeSummary(reminders));
  return sections.join("\n\n");
}

function buildFinalSummary(todayReminders, overdueReminders, completedToday, dateKey) {
  if (!todayReminders.length && !overdueReminders.length) {
    return ["\u{1F514} Amazon Reminder | 9:00 PM", `\u{1F4C5} ${dateKey}`, "\u{1F389} All Done!\nNo pending reminders for today."].join("\n\n");
  }

  const allReminders = [...completedToday, ...todayReminders, ...overdueReminders];
  const sections = ["\u{1F514} Amazon Reminder | 9:00 PM", `\u{1F4C5} ${dateKey}`, "\u{1F4CA} TODAY'S FINAL STATUS"];
  if (completedToday.length) sections.push(formatReminderList(completedToday, dateKey, { completed: true }));
  if (todayReminders.length) sections.push(formatReminderList(todayReminders, dateKey));
  if (overdueReminders.length) sections.push(formatReminderList(overdueReminders, dateKey));
  sections.push(buildTypeSummary(allReminders));
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

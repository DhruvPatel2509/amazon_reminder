import { Link } from "react-router-dom";
import api from "../api";

const typeConfig = {
  review: {
    label: "Review reminder",
    dateLabel: "Review date",
    accent: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  },
  refundForm: {
    label: "Refund form reminder",
    dateLabel: "Form date",
    accent: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  },
  refund: {
    label: "Refund reminder",
    dateLabel: "Refund date",
    accent: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  },
};

const statusConfig = {
  completed: {
    label: "Completed",
    classes: "bg-green-900/30 text-green-300 border-green-800/50",
  },
  upcoming: {
    label: "Upcoming",
    classes: "bg-yellow-900/30 text-yellow-200 border-yellow-800/50",
  },
  overdue: {
    label: "Overdue",
    classes: "bg-red-900/30 text-red-300 border-red-800/50",
  },
};

function formatDate(d) {
  if (!d) return "Not filled";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function targetDate(reminder) {
  return reminder.type === "review" ? reminder.reviewDate : reminder.refundDate;
}

function daysRemaining(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function dueText(reminder) {
  if (reminder.status === "completed") return "Done";
  const days = daysRemaining(targetDate(reminder));
  if (days === null) return "Date missing";
  if (days < 0)
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? "s" : ""}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === "")
    return "Not filled";
  return `Rs. ${Number(amount).toFixed(2)}`;
}

function whatsappNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 ? digits : "";
}

function whatsappLink(reminder) {
  const number = whatsappNumber(reminder.contactPerson);
  if (!number) return "";
  const original =
    reminder.originalAmount == null || reminder.originalAmount === ""
      ? "-"
      : formatAmount(reminder.originalAmount);
  const less =
    reminder.less == null || reminder.less === ""
      ? "-"
      : formatAmount(reminder.less);
  const refundAmt =
    reminder.refundAmount == null || reminder.refundAmount === ""
      ? "-"
      : formatAmount(reminder.refundAmount);
  const refundFormDate = reminder.reviewDate
    ? formatDate(reminder.reviewDate)
    : "-";
  const expectedDate = reminder.refundDate
    ? formatDate(reminder.refundDate)
    : "-";
  const message = [
    "Refund Inquiry",
    "",
    "Hello,",
    "",
    "Mera refund abhi tak credit nahi hua hai. Please status check karein:",
    "",
    `Order ID: ${reminder.orderId || "-"}`,
    "",
    `Original Amount:- ${original}`,
    "",
    `Less:- ${less}`,
    "",
    `Amount: ${refundAmt}`,
    "",
    `Refund Form Fill Date:- ${refundFormDate}`,
    "",
    `Expected Date: ${expectedDate}`,
    "",
    "Thank you!",
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function ReminderRow({ reminder, onDelete, onStatusChange }) {
  const type = typeConfig[reminder.type] || typeConfig.review;
  const status = statusConfig[reminder.status] || statusConfig.upcoming;
  const refundDaysRemaining =
    reminder.type === "refund" ? daysRemaining(reminder.refundDate) : null;
  const canSendRefundMessage =
    reminder.type === "refund" &&
    reminder.status !== "completed" &&
    refundDaysRemaining !== null &&
    refundDaysRemaining <= 0 &&
    whatsappLink(reminder);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${type.label} for Order #${reminder.orderId}?`))
      return;
    try {
      await api.delete(`/reminders/${reminder._id}`);
      onDelete(reminder._id);
    } catch (err) {
      alert("Failed to delete reminder");
    }
  };

  const handleMarkComplete = async () => {
    try {
      await api.put(`/reminders/${reminder._id}`, { status: "completed" });
      onStatusChange(reminder._id, "completed");
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-md border px-2 py-1 text-xs font-display font-semibold ${type.accent}`}
          >
            {type.label}
          </span>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="label mb-1">Order date</p>
              <p className="text-gray-100">{formatDate(reminder.orderDate)}</p>
            </div>
            <div>
              <p className="label mb-1">{type.dateLabel}</p>
              <p className="text-gray-100">
                {formatDate(targetDate(reminder))}
              </p>
            </div>
            {reminder.type === "refund" && (
              <div>
                <p className="label mb-1">WhatsApp</p>
                <p className="text-gray-100">
                  {reminder.contactPerson || "Not filled"}
                </p>
              </div>
            )}
            {reminder.type === "refund" && (
              <div>
                <p className="label mb-1">Refund amount</p>
                <p className="text-gray-100">
                  {formatAmount(reminder.refundAmount)}
                </p>
              </div>
            )}
          </div>
          {reminder.type !== "review" && reminder.notes && (
            <p className="mt-3 text-sm text-gray-300 break-words">
              {reminder.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`status-badge border ${status.classes}`}>
            {status.label}
          </span>
          <span className="text-xs text-gray-300">{dueText(reminder)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Link
          to={`/edit/${reminder._id}`}
          className="rounded-lg border border-border px-3 py-2 text-xs font-display font-medium text-gray-200 hover:border-accent/50 hover:text-white"
        >
          Edit
        </Link>
        {reminder.status !== "completed" && (
          <button
            onClick={handleMarkComplete}
            className="rounded-lg border border-green-800/50 px-3 py-2 text-xs font-display font-medium text-green-300 hover:bg-green-900/30 hover:text-white"
          >
            Complete
          </button>
        )}
        {canSendRefundMessage && (
          <a
            href={canSendRefundMessage}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-green-700/60 bg-green-900/20 px-3 py-2 text-xs font-display font-medium text-green-300 hover:bg-green-900/40 hover:text-white"
          >
            Send Message
          </a>
        )}
        <button
          onClick={handleDelete}
          className="rounded-lg border border-border px-3 py-2 text-xs font-display font-medium text-gray-300 hover:border-red-800/50 hover:bg-red-900/20 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function ReminderCard({ orderGroup, onDelete, onStatusChange }) {
  const reminders = orderGroup.reminders;
  const primary = reminders[0];
  const image = reminders.find((r) => r.productImage)?.productImage;
  const amazonLink = reminders.find((r) => r.amazonLink)?.amazonLink;

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-5 2xl:grid-cols-[160px_1fr]">
        <div className="space-y-3">
          <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border border-border bg-surface flex items-center justify-center lg:max-w-none">
            {image ? (
              <img
                src={image}
                alt={`Product for order ${primary.orderId}`}
                className="h-full w-full object-contain bg-white"
              />
            ) : (
              <div className="px-4 text-center text-sm text-gray-300">
                Product image will appear after Amazon link is saved.
              </div>
            )}
          </div>
          {amazonLink && (
            <a
              href={amazonLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-border px-3 py-2 text-center text-sm font-display font-medium text-orange-200 hover:border-accent/60 hover:text-white"
            >
              Open Amazon link
            </a>
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-display uppercase tracking-widest text-gray-400">
                Order ID
              </p>
              <h3 className="mt-1 break-all font-display text-2xl font-bold text-white">
                #{primary.orderId}
              </h3>
            </div>
            <div className="w-fit rounded-lg border border-border bg-surface px-3 py-2 text-sm text-gray-200">
              {reminders.length}/3 parts filled
            </div>
          </div>

          <div className="space-y-3">
            {["review", "refundForm", "refund"].map((type) => {
              const reminder = reminders.find((item) => item.type === type);
              if (!reminder) {
                return (
                  <div
                    key={type}
                    className="rounded-lg border border-dashed border-border bg-surface/40 p-3 text-sm text-gray-400"
                  >
                    {typeConfig[type].label} not added yet
                  </div>
                );
              }
              return (
                <ReminderRow
                  key={reminder._id}
                  reminder={reminder}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const typeConfig = {
  review: {
    title: "Review Reminder",
    dateLabel: "Review Date",
    taskLabel: "Review karna hai",
    color: "text-orange-200",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
  },
  refundForm: {
    title: "Refund Form Reminder",
    dateLabel: "Form Date",
    taskLabel: "Refund form fill karna hai",
    color: "text-cyan-200",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
  },
  refund: {
    title: "Refund Reminder",
    dateLabel: "Refund Date",
    taskLabel: "Refund check karna hai",
    color: "text-blue-200",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
  },
};

function formatDate(date) {
  if (!date) return "Not filled";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTargetDate(reminder) {
  return reminder.type === "review" ? reminder.reviewDate : reminder.refundDate;
}

function isToday(date) {
  if (!date) return false;
  const target = new Date(date);
  const today = new Date();
  return (
    target.getDate() === today.getDate() &&
    target.getMonth() === today.getMonth() &&
    target.getFullYear() === today.getFullYear()
  );
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  return `Rs. ${Number(amount).toFixed(2)}`;
}

function whatsappLink(reminder) {
  const rawNumber = String(reminder.contactPerson || "").replace(/\D/g, "");
  const number = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
  if (number.length < 11) return "";
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
      : formatAmount(reminder.refundAmount) || "-";
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
    `Amount: Rs. ${refundAmt}`,
    "",
    `Refund Form Fill Date:- ${refundFormDate}`,
    "",
    `Expected Date: ${expectedDate}`,
    "",
    "Thank you!",
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function TodayTaskItem({ reminder }) {
  const config = typeConfig[reminder.type] || typeConfig.review;
  const messageLink = reminder.type === "refund" ? whatsappLink(reminder) : "";

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border ${config.border} ${config.bg} p-4 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div>
        <p className={`text-sm font-display font-semibold ${config.color}`}>
          {config.taskLabel}
        </p>
        <p className="mt-1 break-all text-sm text-white">
          Order #{reminder.orderId}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/edit/${reminder._id}`}
          className="w-fit rounded-md border border-border bg-card px-3 py-2 text-xs font-display font-semibold text-gray-100 hover:border-accent/50"
        >
          Open Task
        </Link>
        {messageLink && (
          <a
            href={messageLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-md border border-green-700/60 bg-green-900/20 px-3 py-2 text-xs font-display font-semibold text-green-300 hover:bg-green-900/40 hover:text-white"
          >
            Send Message
          </a>
        )}
      </div>
    </div>
  );
}

function ReminderListItem({ reminder }) {
  const config = typeConfig[reminder.type] || typeConfig.review;
  const statusClass =
    reminder.status === "completed"
      ? "border-green-800/50 bg-green-900/20 text-green-200"
      : reminder.status === "overdue"
        ? "border-red-800/50 bg-red-900/20 text-red-200"
        : "border-yellow-800/50 bg-yellow-900/20 text-yellow-200";

  return (
    <div className="rounded-lg border border-border bg-surface/70 p-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
          {reminder.productImage ? (
            <img
              src={reminder.productImage}
              alt=""
              className="h-full w-full object-contain bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-all font-display text-sm font-semibold text-white">
                #{reminder.orderId}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <DateBadge date={getTargetDate(reminder)} />
                <p className="text-xs text-gray-300">{config.dateLabel}</p>
              </div>
            </div>

            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-display font-semibold uppercase ${statusClass}`}
            >
              {reminder.status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Link
              to={`/edit/${reminder._id}`}
              className="rounded-md border border-border px-2 py-1 font-display text-gray-200 hover:border-accent/50 hover:text-white"
            >
              Edit
            </Link>
            {reminder.amazonLink && (
              <a
                href={reminder.amazonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border px-2 py-1 font-display text-orange-200 hover:border-accent/50 hover:text-white"
              >
                Amazon
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DateBadge({ date }) {
  if (!date) return <div className="text-sm text-gray-400">No date</div>;
  const d = new Date(date);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const time = d.getTime();
  const isOverdue = time < startOfToday.getTime();
  const diffDays = Math.ceil(
    (time - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isSoon = diffDays <= 7 && diffDays >= 0;

  const day = d.toLocaleDateString("en-IN", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  let classes =
    "flex items-center gap-2 rounded-md px-2 py-1 font-display font-semibold";
  if (isOverdue)
    classes += " bg-red-900/60 text-red-200 border border-red-800/50";
  else if (isSoon)
    classes += " bg-yellow-900/40 text-yellow-200 border border-yellow-800/40";
  else classes += " bg-surface/20 text-gray-200 border border-border";

  return (
    <div className={classes}>
      <div className="flex flex-col items-center justify-center text-sm">
        <span className="text-lg font-bold leading-none">{day}</span>
        <span className="text-[11px]">{mon}</span>
      </div>
    </div>
  );
}

export default function AllRemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("left");

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reminders", { params: { sort: "desc" } });
      const items = res.data.data || [];
      // Sort reminders by nearest target date (earliest first). Null/empty dates go last.
      items.sort((a, b) => {
        const da = getTargetDate(a)
          ? new Date(getTargetDate(a)).getTime()
          : Infinity;
        const db = getTargetDate(b)
          ? new Date(getTargetDate(b)).getTime()
          : Infinity;
        return da - db;
      });
      setReminders(items);
    } catch (err) {
      console.error("Failed to fetch reminders", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const todayTasks = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.status !== "completed" && isToday(getTargetDate(reminder)),
      ),
    [reminders],
  );

  const grouped = useMemo(() => {
    return ["review", "refundForm", "refund"].map((type) => {
      const allItems = reminders.filter((reminder) => reminder.type === type);
      const visibleItems =
        statusFilter === "left"
          ? allItems.filter((reminder) => reminder.status !== "completed")
          : statusFilter === "completed"
            ? allItems.filter((reminder) => reminder.status === "completed")
            : allItems;

      return {
        type,
        allItems,
        visibleItems,
        leftCount: allItems.filter(
          (reminder) => reminder.status !== "completed",
        ).length,
      };
    });
  }, [reminders, statusFilter]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            All Reminders
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            Type-wise view with pending reminders left.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="input-field w-full cursor-pointer sm:w-auto"
        >
          <option value="left">Left Only</option>
          <option value="all">All</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {!loading && (
        <section className="card mb-6 border-orange-500/30">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Today's Work
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                {formatDate(new Date())} ko due pending tasks.
              </p>
            </div>
            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-sm font-display font-semibold text-orange-200">
              {todayTasks.length} Task{todayTasks.length === 1 ? "" : "s"}
            </span>
          </div>

          {todayTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-gray-300">
              Aaj review, refund form ya refund ka koi pending kaam nahi hai.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {todayTasks.map((reminder) => (
                <TodayTaskItem key={reminder._id} reminder={reminder} />
              ))}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {grouped.map((group) => {
            const config = typeConfig[group.type];
            return (
              <section key={group.type} className={`card ${config.border}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2
                      className={`font-display text-lg font-bold ${config.color}`}
                    >
                      {config.title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-300">
                      {group.leftCount} left / {group.allItems.length} total
                    </p>
                  </div>
                  <div
                    className={`rounded-lg border ${config.border} ${config.bg} px-3 py-2 text-center`}
                  >
                    <p className="text-xl font-display font-bold text-white">
                      {group.leftCount}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-gray-300">
                      Left
                    </p>
                  </div>
                </div>

                {group.visibleItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-gray-300">
                    No reminders in this view.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {group.visibleItems.map((reminder) => (
                      <ReminderListItem
                        key={reminder._id}
                        reminder={reminder}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

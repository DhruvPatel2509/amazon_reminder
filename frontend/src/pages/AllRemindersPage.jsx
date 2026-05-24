import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const typeConfig = {
  review: {
    title: 'Review Reminder',
    dateLabel: 'Review Date',
    color: 'text-orange-200',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
  },
  refundForm: {
    title: 'Refund Form Reminder',
    dateLabel: 'Form Date',
    color: 'text-cyan-200',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
  refund: {
    title: 'Refund Reminder',
    dateLabel: 'Refund Date',
    color: 'text-blue-200',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
};

function formatDate(date) {
  if (!date) return 'Not filled';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTargetDate(reminder) {
  return reminder.type === 'review' ? reminder.reviewDate : reminder.refundDate;
}

function ReminderListItem({ reminder }) {
  const config = typeConfig[reminder.type] || typeConfig.review;
  const statusClass =
    reminder.status === 'completed'
      ? 'border-green-800/50 bg-green-900/20 text-green-200'
      : reminder.status === 'overdue'
      ? 'border-red-800/50 bg-red-900/20 text-red-200'
      : 'border-yellow-800/50 bg-yellow-900/20 text-yellow-200';

  return (
    <div className="rounded-lg border border-border bg-surface/70 p-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
          {reminder.productImage ? (
            <img src={reminder.productImage} alt="" className="h-full w-full object-contain bg-white" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="break-all font-display text-sm font-semibold text-white">#{reminder.orderId}</p>
              <p className="mt-1 text-xs text-gray-300">
                {config.dateLabel}: {formatDate(getTargetDate(reminder))}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[11px] font-display font-semibold uppercase ${statusClass}`}>
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

export default function AllRemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('left');

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reminders', { params: { sort: 'desc' } });
      setReminders(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch reminders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const grouped = useMemo(() => {
    return ['review', 'refundForm', 'refund'].map((type) => {
      const allItems = reminders.filter((reminder) => reminder.type === type);
      const visibleItems =
        statusFilter === 'left'
          ? allItems.filter((reminder) => reminder.status !== 'completed')
          : statusFilter === 'completed'
          ? allItems.filter((reminder) => reminder.status === 'completed')
          : allItems;

      return {
        type,
        allItems,
        visibleItems,
        leftCount: allItems.filter((reminder) => reminder.status !== 'completed').length,
      };
    });
  }, [reminders, statusFilter]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">All Reminders</h1>
          <p className="mt-1 text-sm text-gray-300">Type-wise view with pending reminders left.</p>
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
                    <h2 className={`font-display text-lg font-bold ${config.color}`}>{config.title}</h2>
                    <p className="mt-1 text-xs text-gray-300">
                      {group.leftCount} left / {group.allItems.length} total
                    </p>
                  </div>
                  <div className={`rounded-lg border ${config.border} ${config.bg} px-3 py-2 text-center`}>
                    <p className="text-xl font-display font-bold text-white">{group.leftCount}</p>
                    <p className="text-[11px] uppercase tracking-wider text-gray-300">Left</p>
                  </div>
                </div>

                {group.visibleItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-surface/40 p-4 text-sm text-gray-300">
                    No reminders in this view.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {group.visibleItems.map((reminder) => (
                      <ReminderListItem key={reminder._id} reminder={reminder} />
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

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import ReminderCard from '../components/ReminderCard';

function StatCard({ label, value, color }) {
  return (
    <div className="card">
      <p className="text-xs font-display uppercase tracking-widest text-muted mb-2">{label}</p>
      <p className={`text-3xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}

function groupByOrder(reminders) {
  const groups = reminders.reduce((acc, reminder) => {
    if (!acc[reminder.orderId]) acc[reminder.orderId] = [];
    acc[reminder.orderId].push(reminder);
    return acc;
  }, {});

  return Object.entries(groups).map(([orderId, items]) => ({
    orderId,
    reminders: items.sort((a, b) => {
      const order = { review: 0, refundForm: 1, refund: 2 };
      return order[a.type] - order[b.type];
    }),
  }));
}

export default function HomePage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('desc');

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      params.sort = sort;

      const res = await api.get('/reminders', { params });
      setReminders(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch reminders', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sort]);

  useEffect(() => {
    const delay = setTimeout(fetchReminders, 300);
    return () => clearTimeout(delay);
  }, [fetchReminders]);

  const handleDelete = (id) => {
    setReminders((prev) => prev.filter((r) => r._id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    setReminders((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
    );
  };

  // Stats
  const stats = {
    total: reminders.length,
    upcoming: reminders.filter((r) => r.status === 'upcoming').length,
    overdue: reminders.filter((r) => r.status === 'overdue').length,
    completed: reminders.filter((r) => r.status === 'completed').length,
  };
  const orderGroups = groupByOrder(reminders);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">Order Dashboard</h1>
        <p className="text-gray-300 font-body text-sm">One box per order ID with review, refund form, and refund reminders.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Parts" value={stats.total} color="text-white" />
        <StatCard label="Upcoming" value={stats.upcoming} color="text-warning" />
        <StatCard label="Overdue" value={stats.overdue} color="text-danger" />
        <StatCard label="Completed" value={stats.completed} color="text-success" />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-auto cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="review">Review Reminder</option>
          <option value="refundForm">Refund Form Reminder</option>
          <option value="refund">Refund Reminder</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-field w-auto cursor-pointer"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Order Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted text-sm font-body">Loading reminders...</p>
          </div>
        </div>
      ) : orderGroups.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
            <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-white text-lg mb-2">No reminders found</h3>
          <p className="text-muted text-sm mb-6">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first manual reminder to get started'}
          </p>
          <Link to="/review-reminder" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Reminder
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orderGroups.map((group) => (
            <ReminderCard
              key={group.orderId}
              orderGroup={group}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

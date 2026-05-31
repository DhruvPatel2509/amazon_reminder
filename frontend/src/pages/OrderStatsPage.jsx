import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useNotifications } from "../context/NotificationContext";

function formatDateInput(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function daysRemaining(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function daysBetweenDates(startDate, endDate) {
  if (!startDate || !endDate) return "-";
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return `${days} days`;
}

function whatsappNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 ? digits : "";
}

function whatsappMessageLink(reminder) {
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

function sortReminders(reminders, sortBy, sortOrder) {
  return [...reminders].sort((a, b) => {
    const factor = sortOrder === "asc" ? 1 : -1;
    if (
      sortBy === "orderDate" ||
      sortBy === "refundFormDate" ||
      sortBy === "refundDate"
    ) {
      return (new Date(a[sortBy]) - new Date(b[sortBy])) * factor;
    }
    if (sortBy === "orderGroup") {
      return (
        String(a.orderGroup || "").localeCompare(String(b.orderGroup || "")) *
        factor
      );
    }
    return (Number(a[sortBy] || 0) - Number(b[sortBy] || 0)) * factor;
  });
}

export default function OrderStatsPage() {
  const navigate = useNavigate();
  const { refresh } = useNotifications();
  const [form, setForm] = useState({
    orderId: "",
    orderDate: "",
    reviewDate: "",
    amazonLink: "",
    productImage: "",
    refundFormDate: "",
    refundDate: "",
    originalAmount: "",
    refundAmount: "",
    refundStatus: "pending",
    contactPerson: "",
    orderGroup: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderReminders, setOrderReminders] = useState({});
  const [groupFilter, setGroupFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("refundDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get("/orders", { params: { sort: "desc" } });
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await api.get("/reminders");
      const reminders = res.data.data || [];
      const map = reminders.reduce((acc, reminder) => {
        const key = String(reminder.orderId || "").trim();
        if (!key) return acc;
        if (!acc[key]) acc[key] = {};
        if (reminder.type === "refundForm") acc[key].refundForm = reminder;
        if (reminder.type === "refund") acc[key].refund = reminder;
        return acc;
      }, {});
      setOrderReminders(map);
    } catch (err) {
      console.error("Failed to fetch reminders", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchReminders();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.orderId.trim()) e.orderId = "Order ID is required";
    if (!form.orderDate) e.orderDate = "Order date is required";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/orders/${editingId}`, form);
      } else {
        await api.post("/orders", form);
      }
      setSuccess(true);
      setForm({
        orderId: "",
        orderDate: "",
        reviewDate: "",
        amazonLink: "",
        productImage: "",
        refundFormDate: "",
        refundDate: "",
        originalAmount: "",
        refundAmount: "",
        refundStatus: "pending",
        contactPerson: "",
        orderGroup: "",
        notes: "",
      });
      refresh();
      fetchOrders();
      setEditingId(null);
      setShowForm(false);
      setTimeout(() => setSuccess(false), 2400);
    } catch (err) {
      setErrors({
        general: err.response?.data?.message || "Failed to save order",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      orderId: item.orderId || "",
      orderDate: formatDateInput(item.orderDate),
      reviewDate: formatDateInput(item.reviewDate),
      amazonLink: item.amazonLink || "",
      productImage: item.productImage || "",
      refundFormDate: formatDateInput(item.refundFormDate),
      refundDate: formatDateInput(item.refundDate),
      originalAmount: item.originalAmount || "",
      refundAmount: item.refundAmount || "",
      refundStatus: item.refundStatus || "pending",
      contactPerson: item.contactPerson || "",
      orderGroup: item.orderGroup || "",
      notes: item.notes || "",
    });
    setEditingId(item._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item) => {
    // confirm before delete
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Delete order ${item.orderId}? This cannot be undone.`))
      return;
    try {
      await api.delete(`/orders/${item._id}`);
      fetchOrders();
      refresh();
    } catch (err) {
      console.error("Failed to delete order", err);
      setErrors({
        general: err.response?.data?.message || "Failed to delete order",
      });
    }
  };

  const saveRefundStatus = async (item, refundStatus) => {
    if (refundStatus === (item.refundStatus || "pending")) return;

    setStatusUpdating((prev) => ({ ...prev, [item._id]: true }));
    try {
      await api.put(`/orders/${item._id}`, {
        orderId: item.orderId,
        orderDate: item.orderDate,
        reviewDate: item.reviewDate || "",
        amazonLink: item.amazonLink || "",
        productImage: item.productImage || "",
        refundFormDate: item.refundFormDate || "",
        refundDate: item.refundDate,
        originalAmount: item.originalAmount ?? "",
        refundAmount: item.refundAmount ?? "",
        refundStatus,
        contactPerson: item.contactPerson || "",
        orderGroup: item.orderGroup || "",
        notes: item.notes || "",
        status: item.status || "open",
      });
      setOrders((prev) =>
        prev.map((order) =>
          order._id === item._id ? { ...order, refundStatus } : order,
        ),
      );
      refresh();
      setStatusMessage(
        `Refund status for ${item.orderId} updated to ${refundStatus}.`,
      );
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      console.error("Failed to update refund status", err);
      setErrors({
        general:
          err.response?.data?.message || "Failed to update refund status",
      });
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [item._id]: false }));
    }
  };

  const groups = useMemo(() => {
    const set = new Set();
    orders.forEach((item) => {
      const group = item.orderGroup?.trim() || "Unassigned";
      set.add(group);
    });
    return ["all", ...Array.from(set).sort()];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((item) => {
      const matchesGroup =
        groupFilter === "all" ||
        (item.orderGroup?.trim() || "Unassigned") === groupFilter;
      const matchesSearch =
        searchText.trim() === "" ||
        item.orderId.toLowerCase().includes(searchText.trim().toLowerCase());
      return matchesGroup && matchesSearch;
    });
    return sortReminders(filtered, sortBy, sortOrder);
  }, [orders, groupFilter, searchText, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const summary = {
      count: filteredOrders.length,
      totalOriginal: 0,
      totalRefund: 0,
      totalCreditedRefund: 0,
      pendingRefundAmount: 0,
      totalSpent: 0,
      overdueCount: 0,
      upcomingCount: 0,
      completedCount: 0,
      groups: {},
      refundAmountByStatus: {
        pending: 0,
        credited: 0,
        cancelled: 0,
      },
    };

    filteredOrders.forEach((item) => {
      const original = Number(item.originalAmount || 0);
      const refund = Number(item.refundAmount || 0);
      const refundStatus = item.refundStatus || "pending";

      summary.totalOriginal += original;
      summary.totalRefund += refund;
      summary.refundAmountByStatus[refundStatus] += refund;
      if (refundStatus === "pending") summary.pendingRefundAmount += refund;
      if (refundStatus === "credited") summary.totalCreditedRefund += refund;

      if (item.status === "refunded") summary.completedCount += 1;
      else if (item.status === "failed") summary.overdueCount += 1;

      const key = item.orderGroup?.trim() || "Unassigned";
      if (!summary.groups[key]) {
        summary.groups[key] = { count: 0, totalOriginal: 0, totalRefund: 0 };
      }
      summary.groups[key].count += 1;
      summary.groups[key].totalOriginal += original;
      summary.groups[key].totalRefund += refund;
    });

    summary.totalSpent = summary.totalOriginal - summary.totalCreditedRefund;
    return summary;
  }, [filteredOrders]);

  const refundStatusSummary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        const status = order.refundStatus || "pending";
        if (acc[status] !== undefined) acc[status] += 1;
        return acc;
      },
      { pending: 0, credited: 0, cancelled: 0 },
    );
  }, [filteredOrders]);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/"
            className="text-muted hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors w-fit"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="font-display font-bold text-3xl text-white">
            Order Stats
          </h1>
          <p className="text-gray-400 mt-1 max-w-2xl">
            Add order data and review totals by group, refund values, pending
            status and date sorting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingId(null);
              setForm({
                orderId: "",
                orderDate: "",
                reviewDate: "",
                amazonLink: "",
                productImage: "",
                refundFormDate: "",
                refundDate: "",
                originalAmount: "",
                refundAmount: "",
                refundStatus: "pending",
                contactPerson: "",
                orderGroup: "",
                notes: "",
              });
              setShowForm(true);
            }}
            className="btn-primary"
          >
            Add New Order
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-green-800/50 bg-green-900/20 p-4 text-green-200">
          Order saved successfully. Summary updated.
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-green-800/50 bg-green-900/20 p-4 text-green-200">
          {statusMessage}
        </div>
      )}

      {errors.general && (
        <div className="mb-6 rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-red-300">
          {errors.general}
        </div>
      )}

      <div className="relative">
        {/* Top slide-down form panel */}
        {showForm && (
          <div className="fixed inset-x-0 top-0 z-50 bg-surface border-b border-border shadow-lg p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-white mb-1">
                    New Order Entry
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Enter order details to add to the state.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Order ID *</label>
                    <input
                      type="text"
                      name="orderId"
                      value={form.orderId}
                      onChange={handleChange}
                      placeholder="e.g. 402-1234567-8901234"
                      className={`input-field ${errors.orderId ? "border-danger" : ""}`}
                    />
                    {errors.orderId && (
                      <p className="text-danger text-xs mt-1">
                        {errors.orderId}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Order Date *</label>
                    <input
                      type="date"
                      name="orderDate"
                      value={form.orderDate}
                      onChange={handleChange}
                      className={`input-field ${errors.orderDate ? "border-danger" : ""}`}
                    />
                    {errors.orderDate && (
                      <p className="text-danger text-xs mt-1">
                        {errors.orderDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Review Date</label>
                    <input
                      type="date"
                      name="reviewDate"
                      value={form.reviewDate}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Refund Form Fill Date</label>
                    <input
                      type="date"
                      name="refundFormDate"
                      value={form.refundFormDate}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Refund Date *</label>
                    <input
                      type="date"
                      name="refundDate"
                      value={form.refundDate}
                      onChange={handleChange}
                      className={`input-field ${errors.refundDate ? "border-danger" : ""}`}
                    />
                    {errors.refundDate && (
                      <p className="text-danger text-xs mt-1">
                        {errors.refundDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Original Amount</label>
                    <input
                      type="number"
                      name="originalAmount"
                      value={form.originalAmount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Refund Amount</label>
                    <input
                      type="number"
                      name="refundAmount"
                      value={form.refundAmount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Refund</label>
                    <select
                      name="refundStatus"
                      value={form.refundStatus}
                      onChange={handleChange}
                      className="input-field cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="credited">Credited</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={form.contactPerson}
                      onChange={handleChange}
                      placeholder="Name or WhatsApp number"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Which Group</label>
                    <input
                      type="text"
                      name="orderGroup"
                      value={form.orderGroup}
                      onChange={handleChange}
                      placeholder="e.g. Electronics"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Amazon Product Link</label>
                    <input
                      type="url"
                      name="amazonLink"
                      value={form.amazonLink}
                      onChange={handleChange}
                      placeholder="https://www.amazon.in/..."
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Product Image URL</label>
                    <input
                      type="url"
                      name="productImage"
                      value={form.productImage}
                      onChange={handleChange}
                      placeholder="Optional image URL"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Extra details for this order"
                    className="input-field resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? (
                      "Save Changes"
                    ) : (
                      "Save Order"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm({
                        orderId: "",
                        orderDate: "",
                        reviewDate: "",
                        amazonLink: "",
                        productImage: "",
                        refundDate: "",
                        refundFormDate: "",
                        originalAmount: "",
                        refundAmount: "",
                        refundStatus: "pending",
                        contactPerson: "",
                        orderGroup: "",
                        notes: "",
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Total orders</span>
              <p className="text-3xl font-bold text-white">{stats.count}</p>
              <p className="text-gray-400 text-sm mt-1">
                Orders matching current filters
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Pending refunds</span>
              <p className="text-3xl font-bold text-amber-200">
                {refundStatusSummary.pending}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Refunds waiting for credit
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Pending refund amount</span>
              <p className="text-3xl font-bold text-amber-200">
                {formatAmount(stats.pendingRefundAmount)}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Amount not yet credited
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Credited refunds</span>
              <p className="text-3xl font-bold text-emerald-200">
                {refundStatusSummary.credited}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Refunds already processed
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Total credited refund</span>
              <p className="text-3xl font-bold text-emerald-200">
                {formatAmount(stats.totalCreditedRefund)}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Only credited refund amount
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Cancelled refunds</span>
              <p className="text-3xl font-bold text-red-200">
                {refundStatusSummary.cancelled}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Refunds cancelled or voided
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Total original</span>
              <p className="text-3xl font-bold text-white">
                {formatAmount(stats.totalOriginal)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="label">Money spent</span>
              <p className="text-3xl font-bold text-white">
                {formatAmount(stats.totalSpent)}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Total original minus credited refunds
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display font-semibold text-white text-lg">
                  Order filters
                </h2>
                <p className="text-gray-400 text-sm">
                  Group filter, search and sorting.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group === "all" ? "All groups" : group}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="orderDate">Order Date</option>
                  <option value="refundFormDate">Refund Form Fill Date</option>
                  <option value="refundDate">Refund Date</option>
                  <option value="originalAmount">Original Amount</option>
                  <option value="refundAmount">Refund Amount</option>
                  <option value="orderGroup">Group</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
            <div>
              <input
                type="search"
                placeholder="Search by Order ID"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-widest text-gray-400">
                  <th className="px-3 py-3">Image</th>
                  <th className="px-3 py-3">Order ID</th>
                  <th className="px-3 py-3">Group</th>
                  <th className="px-3 py-3">Order Date</th>
                  <th className="px-3 py-3">Refund Form</th>
                  <th className="px-3 py-3">Refund</th>
                  <th className="px-3 py-3">Refund Interval</th>
                  <th className="px-3 py-3">Original</th>
                  <th className="px-3 py-3">Refund</th>
                  <th className="px-3 py-3">Refund Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-3 py-10 text-center text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        <span>Loading order data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-3 py-10 text-center text-gray-400"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((item) => {
                    const reminderEntry =
                      orderReminders[String(item.orderId || "").trim()] || {};
                    const refundReminder = reminderEntry.refund;
                    const refundFormDate =
                      item.refundFormDate || refundReminder?.reviewDate || "";
                    const refundDate =
                      refundReminder?.refundDate || item.refundDate || "";
                    const refundReminderLink =
                      refundReminder && refundReminder.status !== "completed"
                        ? whatsappMessageLink(refundReminder)
                        : "";
                    const showRefundMessage =
                      refundReminderLink &&
                      refundReminder?.refundDate &&
                      daysRemaining(refundReminder?.refundDate) <= 0 &&
                      item.refundStatus !== "credited";

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-border hover:bg-white/5"
                      >
                        <td className="px-3 py-3">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt="product"
                              className="h-12 w-12 object-contain bg-white rounded"
                            />
                          ) : (
                            <div className="h-12 w-12 flex items-center justify-center bg-card text-gray-400 rounded">
                              —
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-white">
                          #{item.orderId}
                        </td>
                        <td className="px-3 py-3">
                          {item.orderGroup || "Unassigned"}
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(item.orderDate)}
                        </td>
                        <td className="px-3 py-3">
                          {refundFormDate ? formatDate(refundFormDate) : "-"}
                        </td>
                        <td className="px-3 py-3">
                          {refundDate
                            ? formatDate(refundDate)
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          {daysBetweenDates(refundFormDate, refundDate)}
                        </td>
                        <td className="px-3 py-3">
                          {formatAmount(item.originalAmount)}
                        </td>
                        <td className="px-3 py-3">
                          {formatAmount(item.refundAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.refundStatus || "pending"}
                            onChange={(e) =>
                              saveRefundStatus(item, e.target.value)
                            }
                            disabled={Boolean(statusUpdating[item._id])}
                            className="input-field min-w-[140px] w-full cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="credited">Credited</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {showRefundMessage && (
                              <a
                                href={refundReminderLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-green-700/60 bg-green-900/20 px-2 py-1 text-xs font-medium text-green-200 hover:bg-green-900/40"
                              >
                                Send message
                              </a>
                            )}
                            <button
                              onClick={() => handleEdit(item)}
                              className="rounded-md border border-border px-2 py-1 text-xs font-display text-gray-200 hover:border-accent/50 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="rounded-md border border-border px-2 py-1 text-xs font-display text-red-300 hover:bg-red-900/30"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold text-xl text-white mb-4">
          Group breakdown
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(stats.groups).map(([group, data]) => (
            <div
              key={group}
              className="rounded-3xl border border-border p-4 bg-surface/80"
            >
              <p className="text-sm text-gray-400 uppercase tracking-[0.2em] mb-2">
                {group}
              </p>
              <p className="text-2xl font-bold text-white">
                {data.count} orders
              </p>
              <p className="text-gray-300 mt-1 text-sm">
                Original: {formatAmount(data.totalOriginal)}
              </p>
              <p className="text-gray-300 text-sm">
                Refund: {formatAmount(data.totalRefund)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useNotifications } from '../context/NotificationContext';

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

function reminderTitle(type) {
  if (type === 'review') return 'Review';
  if (type === 'refundForm') return 'Refund Form';
  return 'Refund';
}

function calculateRefundAmount(originalAmount, less) {
  if (originalAmount === '') return '';
  return (Number(originalAmount) - Number(less || 0)).toFixed(2);
}

export default function EditReminderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useNotifications();

  const [reminder, setReminder] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/reminders/${id}`)
      .then((res) => {
        const r = res.data.data;
        setReminder(r);
        setForm({
          orderId: r.orderId || '',
          orderDate: formatDateInput(r.orderDate),
          amazonLink: r.amazonLink || '',
          productImage: r.productImage || '',
          reviewDate: formatDateInput(r.reviewDate),
          refundDate: formatDateInput(r.refundDate),
          contactPerson: r.contactPerson || '',
          originalAmount: r.originalAmount ?? '',
          less: r.less ?? '',
          refundAmount: r.refundAmount ?? '',
          status: r.status || 'upcoming',
          notes: r.notes || '',
        });
      })
      .catch(() => alert('Failed to load reminder'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'originalAmount' || name === 'less') {
        updated.refundAmount = calculateRefundAmount(updated.originalAmount, updated.less);
      }
      return updated;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.orderId.trim()) e.orderId = 'Order ID is required';
    if (!form.orderDate) e.orderDate = 'Order date is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = { ...form };
      if (reminder.type === 'review') payload.notes = '';
      if (reminder.type === 'refundForm') payload.contactPerson = '';
      await api.put(`/reminders/${id}`, payload);
      setSuccess(true);
      refresh();
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Failed to update reminder' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!reminder) return (
    <div className="text-center py-20">
      <p className="text-muted">Reminder not found.</p>
      <Link to="/" className="btn-primary mt-4 inline-block">Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-8">
        <Link to="/" className="text-muted hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="font-display font-bold text-2xl text-white mb-1">
          Edit {reminderTitle(reminder.type)} Reminder
        </h1>
        <p className="text-muted text-sm font-mono">Order #{reminder.orderId}</p>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-green-800/50 bg-green-900/20 p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-400 text-sm">Updated successfully! Redirecting...</p>
        </div>
      )}

      {errors.general && (
        <div className="mb-6 rounded-xl border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Order ID *</label>
          <input type="text" name="orderId" value={form.orderId} onChange={handleChange}
            className={`input-field ${errors.orderId ? 'border-danger' : ''}`} />
          {errors.orderId && <p className="text-danger text-xs mt-1">{errors.orderId}</p>}
        </div>

        <div>
          <label className="label">Order Date *</label>
          <input type="date" name="orderDate" value={form.orderDate} onChange={handleChange}
            className={`input-field ${errors.orderDate ? 'border-danger' : ''}`} />
          {errors.orderDate && <p className="text-danger text-xs mt-1">{errors.orderDate}</p>}
        </div>

        <div>
          <label className="label">Amazon Product Link</label>
          <input type="url" name="amazonLink" value={form.amazonLink} onChange={handleChange}
            placeholder="https://www.amazon.in/..." className="input-field" />
        </div>

        <div>
          <label className="label">Product Image URL</label>
          <input type="url" name="productImage" value={form.productImage} onChange={handleChange}
            placeholder="Optional if Amazon image is not detected" className="input-field" />
        </div>

        {reminder.type === 'review' && (
          <div>
            <label className="label">Review Date</label>
            <input type="date" name="reviewDate" value={form.reviewDate} onChange={handleChange}
              className="input-field" />
          </div>
        )}

        {(reminder.type === 'refund' || reminder.type === 'refundForm') && (
          <>
            {reminder.type === 'refund' && (
              <div>
                <label className="label">Review Date</label>
                <input type="date" name="reviewDate" value={form.reviewDate} onChange={handleChange}
                  className="input-field" />
              </div>
            )}
            <div>
              <label className="label">{reminder.type === 'refundForm' ? 'Refund Form Date' : 'Refund Date'}</label>
              <input type="date" name="refundDate" value={form.refundDate} onChange={handleChange}
                className="input-field" />
            </div>
            {reminder.type === 'refund' && <div>
              <label className="label">WhatsApp Number</label>
              <input type="tel" name="contactPerson" value={form.contactPerson} onChange={handleChange}
                placeholder="e.g. 919876543210" className="input-field" />
              <p className="mt-1 text-xs text-gray-400">Country code ke saath number enter karein.</p>
            </div>}
            {reminder.type === 'refund' && (
              <>
                <div>
                  <label className="label">Original Amount</label>
                  <input type="number" name="originalAmount" value={form.originalAmount} onChange={handleChange}
                    min="0" step="0.01" placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="label">Less</label>
                  <input type="number" name="less" value={form.less} onChange={handleChange}
                    min="0" step="0.01" placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="label">Refund Amount</label>
                  <input type="number" name="refundAmount" value={form.refundAmount}
                    placeholder="Calculated automatically" className="input-field" readOnly />
                </div>
              </>
            )}
          </>
        )}

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className="input-field cursor-pointer">
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Notes */}
        {reminder.type !== 'review' && <div>
          <label className="label">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            className="input-field resize-none" placeholder="Any additional notes..." />
        </div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
            ) : 'Save Changes'}
          </button>
          <Link to="/" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

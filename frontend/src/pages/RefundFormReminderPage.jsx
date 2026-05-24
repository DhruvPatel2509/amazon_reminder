import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useNotifications } from '../context/NotificationContext';

export default function RefundFormReminderPage() {
  const navigate = useNavigate();
  const { refresh } = useNotifications();
  const [form, setForm] = useState({
    orderId: '',
    orderDate: '',
    amazonLink: '',
    productImage: '',
    refundDate: '',
    contactPerson: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.orderId.trim()) e.orderId = 'Order ID is required';
    if (!form.orderDate) e.orderDate = 'Order date is required';
    if (!form.refundDate) e.refundDate = 'Refund form date is required';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await api.post('/reminders/refund-form', form);
      setSuccess(true);
      refresh();
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Failed to create reminder' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="mb-8">
        <Link to="/" className="text-gray-300 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-cyan-500/15 border border-cyan-500/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h7l3 3v13H7V4z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Refund Form Reminder</h1>
            <p className="text-gray-300 text-sm">Fill this part manually for the order.</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-green-800/50 bg-green-900/20 p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-300 text-sm">Refund form reminder created.</p>
        </div>
      )}

      {errors.general && (
        <div className="mb-6 rounded-xl border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-red-300 text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Order ID *</label>
          <input type="text" name="orderId" value={form.orderId} onChange={handleChange}
            placeholder="e.g. 402-1234567-8901234"
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

        <div>
          <label className="label">Refund Form Date *</label>
          <input type="date" name="refundDate" value={form.refundDate} onChange={handleChange}
            className={`input-field ${errors.refundDate ? 'border-danger' : ''}`} />
          {errors.refundDate && <p className="text-danger text-xs mt-1">{errors.refundDate}</p>}
        </div>

        <div>
          <label className="label">Contact Person</label>
          <input type="text" name="contactPerson" value={form.contactPerson} onChange={handleChange}
            placeholder="e.g. Amazon Support" className="input-field" />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            placeholder="Refund form details..."
            className="input-field resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>Create Reminder</>
            )}
          </button>
          <Link to="/" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

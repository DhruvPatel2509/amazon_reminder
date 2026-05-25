import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useNotifications } from '../context/NotificationContext';

export default function ReviewReminderPage() {
  const navigate = useNavigate();
  const { refresh } = useNotifications();
  const [form, setForm] = useState({
    orderId: '',
    orderDate: '',
    reviewDate: '',
    amazonLink: '',
    productImage: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.orderId.trim()) e.orderId = 'Order ID is required';
    if (!form.orderDate) e.orderDate = 'Order date is required';
    if (!form.reviewDate) e.reviewDate = 'Review date is required';
    if (!form.amazonLink.trim()) e.amazonLink = 'Amazon product link is required';
    else if (!form.amazonLink.includes('amazon')) e.amazonLink = 'Please enter a valid Amazon link';
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
      await api.post('/reminders/review', form);
      setSuccess('Review reminder created.');
      refresh();
      setForm({ orderId: '', orderDate: '', reviewDate: '', amazonLink: '', productImage: '' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Failed to create reminder' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="text-muted hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-accent/15 border border-accent/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Review Reminder</h1>
            <p className="text-gray-300 text-sm">Fill this part manually for the order.</p>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-6 rounded-xl border border-green-800/50 bg-green-900/20 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-400 text-sm font-body">{success}</p>
        </div>
      )}

      {/* Error */}
      {errors.general && (
        <div className="mb-6 rounded-xl border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Order ID */}
        <div>
          <label className="label">Order ID *</label>
          <input
            type="text"
            name="orderId"
            value={form.orderId}
            onChange={handleChange}
            placeholder="e.g. 402-1234567-8901234"
            className={`input-field ${errors.orderId ? 'border-danger' : ''}`}
          />
          {errors.orderId && <p className="text-danger text-xs mt-1">{errors.orderId}</p>}
        </div>

        {/* Order Date */}
        <div>
          <label className="label">Order Date *</label>
          <input
            type="date"
            name="orderDate"
            value={form.orderDate}
            onChange={handleChange}
            className={`input-field ${errors.orderDate ? 'border-danger' : ''}`}
          />
          {errors.orderDate && <p className="text-danger text-xs mt-1">{errors.orderDate}</p>}
        </div>

        {/* Review Date */}
        <div>
          <label className="label">Review Date *</label>
          <input
            type="date"
            name="reviewDate"
            value={form.reviewDate}
            onChange={handleChange}
            className={`input-field ${errors.reviewDate ? 'border-danger' : ''}`}
          />
          {errors.reviewDate && <p className="text-danger text-xs mt-1">{errors.reviewDate}</p>}
        </div>

        {/* Amazon Link */}
        <div>
          <label className="label">Amazon Product Link *</label>
          <input
            type="url"
            name="amazonLink"
            value={form.amazonLink}
            onChange={handleChange}
            placeholder="https://www.amazon.in/..."
            className={`input-field ${errors.amazonLink ? 'border-danger' : ''}`}
          />
          {errors.amazonLink && <p className="text-danger text-xs mt-1">{errors.amazonLink}</p>}
        </div>

        <div>
          <label className="label">Product Image URL</label>
          <input
            type="url"
            name="productImage"
            value={form.productImage}
            onChange={handleChange}
            placeholder="Optional if Amazon image is not detected"
            className="input-field"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Reminder
              </>
            )}
          </button>
          <Link to="/" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

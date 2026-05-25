const Reminder = require('../models/Reminder');

async function getProductImage(amazonLink) {
  if (!amazonLink || !amazonLink.includes('amazon')) return '';

  try {
    const response = await fetch(amazonLink, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return '';
    const html = await response.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/["']landingImage["']\s*:\s*["']([^"']+)["']/i) ||
      html.match(/data-old-hires=["']([^"']+)["']/i) ||
      html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i) ||
      html.match(/data-a-dynamic-image=["']\{&quot;([^&]+)&quot;/i);

    return match?.[1]?.replace(/\\\//g, '/').replace(/&amp;/g, '&') || '';
  } catch (err) {
    return '';
  }
}

function typeLabel(type) {
  if (type === 'review') return 'Review';
  if (type === 'refundForm') return 'Refund form';
  return 'Refund';
}

function calculateRefundAmount(originalAmount, less) {
  if (originalAmount === undefined || originalAmount === null || originalAmount === '') return null;
  return Number(originalAmount) - Number(less || 0);
}

// Helper: compute status
function computeStatus(targetDate, currentStatus) {
  if (currentStatus === 'completed') return 'completed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return target < today ? 'overdue' : 'upcoming';
}

// GET all reminders with optional filter/sort/search
exports.getAllReminders = async (req, res) => {
  try {
    const { search, status, sort, type } = req.query;
    const query = {};

    if (search) query.orderId = { $regex: search, $options: 'i' };
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;

    const sortOption = sort === 'asc' ? { orderDate: 1 } : { orderDate: -1 };

    // Auto-update statuses before returning
    const all = await Reminder.find(query).sort(sortOption);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const r of all) {
      if (r.status !== 'completed') {
        const targetDate = r.type === 'review' ? r.reviewDate : r.refundDate;
        if (targetDate) {
          const target = new Date(targetDate);
          target.setHours(0, 0, 0, 0);
          const newStatus = target < today ? 'overdue' : 'upcoming';
          if (r.status !== newStatus) {
            r.status = newStatus;
            await r.save();
          }
        }
      }
      if (r.amazonLink && !r.productImage) {
        const productImage = await getProductImage(r.amazonLink);
        if (productImage) {
          r.productImage = productImage;
          await r.save();
        }
      }
    }

    const updated = await Reminder.find(query).sort(sortOption);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single reminder
exports.getReminderById = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET today's + upcoming notifications
exports.getNotifications = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const all = await Reminder.find({ status: { $ne: 'completed' } });
    const notifications = [];

    for (const r of all) {
      const targetDate = r.type === 'review' ? r.reviewDate : r.refundDate;
      if (!targetDate) continue;

      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);

      const label = typeLabel(r.type);

      if (target.getTime() === today.getTime()) {
        notifications.push({
          id: r._id,
          orderId: r.orderId,
          type: r.type,
          urgency: 'today',
          message: `${label} reminder for Order #${r.orderId} is due TODAY`,
          date: targetDate,
        });
      } else if (target.getTime() === tomorrow.getTime()) {
        notifications.push({
          id: r._id,
          orderId: r.orderId,
          type: r.type,
          urgency: 'tomorrow',
          message: `${label} reminder for Order #${r.orderId} is due TOMORROW`,
          date: targetDate,
        });
      } else if (target < today) {
        notifications.push({
          id: r._id,
          orderId: r.orderId,
          type: r.type,
          urgency: 'overdue',
          message: `${label} reminder for Order #${r.orderId} is OVERDUE`,
          date: targetDate,
        });
      }
    }

    // Sort: overdue first, then today, then tomorrow
    const urgencyOrder = { overdue: 0, today: 1, tomorrow: 2 };
    notifications.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create review reminder
exports.createReviewReminder = async (req, res) => {
  try {
    const { orderId, orderDate, reviewDate, amazonLink, productImage } = req.body;

    if (!orderId || !orderDate || !reviewDate) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const reviewReminder = new Reminder({
      orderId,
      orderDate,
      reviewDate,
      amazonLink,
      productImage: productImage || (await getProductImage(amazonLink)),
      type: 'review',
    });
    await reviewReminder.save();

    res.status(201).json({
      success: true,
      message: 'Review reminder created',
      data: reviewReminder,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create refund form reminder
exports.createRefundFormReminder = async (req, res) => {
  try {
    const { orderId, orderDate, amazonLink, refundDate, notes, productImage } = req.body;

    if (!orderId || !orderDate || !refundDate) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Order Date and Refund Form Date are required',
      });
    }

    const reminder = new Reminder({
      orderId,
      orderDate,
      amazonLink,
      productImage: productImage || (await getProductImage(amazonLink)),
      refundDate,
      notes,
      type: 'refundForm',
    });
    await reminder.save();

    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create refund reminder
exports.createRefundReminder = async (req, res) => {
  try {
    const { orderId, orderDate, amazonLink, reviewDate, refundDate, contactPerson, originalAmount, less, notes, productImage } = req.body;

    if (!orderId || !orderDate || !refundDate) {
      return res.status(400).json({ success: false, message: 'Order ID, Order Date and Refund Date are required' });
    }

    const reminder = new Reminder({
      orderId,
      orderDate,
      amazonLink,
      productImage: productImage || (await getProductImage(amazonLink)),
      reviewDate,
      refundDate,
      contactPerson,
      originalAmount: originalAmount === '' ? null : originalAmount,
      less: less === '' ? null : less,
      refundAmount: calculateRefundAmount(originalAmount, less),
      notes,
      type: 'refund',
    });
    await reminder.save();

    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update reminder
exports.updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    const fields = ['orderId', 'orderDate', 'amazonLink', 'productImage', 'reviewDate', 'refundDate', 'contactPerson', 'originalAmount', 'less', 'status', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) reminder[f] = req.body[f];
    });
    if (reminder.type === 'review') reminder.notes = '';
    if (reminder.type === 'refundForm') {
      reminder.contactPerson = '';
      reminder.originalAmount = null;
      reminder.less = null;
      reminder.refundAmount = null;
    }
    if (reminder.type === 'refund') {
      reminder.refundAmount = calculateRefundAmount(reminder.originalAmount, reminder.less);
    }
    if (req.body.amazonLink && !req.body.productImage) {
      reminder.productImage = await getProductImage(req.body.amazonLink);
    }

    await reminder.save();
    res.json({ success: true, data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE reminder
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

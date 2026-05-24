const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reminderController');

router.get('/', ctrl.getAllReminders);
router.get('/notifications', ctrl.getNotifications);
router.get('/:id', ctrl.getReminderById);
router.post('/review', ctrl.createReviewReminder);
router.post('/refund-form', ctrl.createRefundFormReminder);
router.post('/refund', ctrl.createRefundReminder);
router.put('/:id', ctrl.updateReminder);
router.delete('/:id', ctrl.deleteReminder);

module.exports = router;

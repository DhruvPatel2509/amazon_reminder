const express = require("express");
const { sendDailyReminder } = require("../controllers/notificationController");

const router = express.Router();

router.post("/daily-reminder", sendDailyReminder);

module.exports = router;

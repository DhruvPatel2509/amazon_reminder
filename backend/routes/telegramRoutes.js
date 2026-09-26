const express = require("express");
const sendTelegramMessage = require("../utils/telegram");

const router = express.Router();

router.get("/test", async (req, res) => {
  try {
    await sendTelegramMessage(
      "🔔 Amazon Reminder Test\n\nTelegram notification is working successfully!",
    );

    res.json({
      success: true,
      message: "Telegram message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

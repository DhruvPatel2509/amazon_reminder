const sendTelegramMessage = async (message, options = {}) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Telegram environment variables are missing");
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          ...options,
        }),
      },
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || "Telegram API error");
    }

    return data;
  } catch (error) {
    console.error("Telegram Error:", error.message);
    throw error;
  }
};

module.exports = sendTelegramMessage;

const Order = require("../models/Order");

async function getProductImage(link) {
  if (!link) return "";

  try {
    const response = await fetch(link, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return "";
    const html = await response.text();
    const match =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      ) ||
      html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      // Amazon specific fallbacks
      html.match(/['"]landingImage['"]\s*:\s*['"]([^'\"]+)['"]/i) ||
      html.match(/data-old-hires=["']([^"']+)["']/i) ||
      html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i) ||
      html.match(/data-a-dynamic-image=["']\{&quot;([^&]+)&quot;/i);

    return match?.[1]?.replace(/\\\//g, "/").replace(/&amp;/g, "&") || "";
  } catch (err) {
    return "";
  }
}

// GET all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { search, group, sort } = req.query;
    const query = {};
    if (search) query.orderId = { $regex: search, $options: "i" };
    if (group && group !== "all") query.orderGroup = group;

    const sortOption = sort === "asc" ? { orderDate: 1 } : { orderDate: -1 };
    const all = await Order.find(query).sort(sortOption);

    // Auto-fill productImage if missing (try extract from amazonLink)
    for (const o of all) {
      if (o.amazonLink && !o.productImage) {
        const productImage = await getProductImage(o.amazonLink);
        if (productImage) {
          o.productImage = productImage;
          await o.save();
        }
      }
    }

    const updated = await Order.find(query).sort(sortOption);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST create order
exports.createOrder = async (req, res) => {
  try {
    const {
      orderId,
      orderDate,
      amazonLink,
      refundDate,
      originalAmount,
      refundAmount,
      orderGroup,
      notes,
      productImage,
    } = req.body;
    if (!orderId || !orderDate) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Order Date are required",
      });
    }

    const finalImage = productImage || (await getProductImage(amazonLink));

    const order = new Order({
      orderId,
      orderDate,
      amazonLink,
      productImage: finalImage,
      refundDate,
      originalAmount: originalAmount === "" ? null : originalAmount,
      refundAmount: refundAmount === "" ? null : refundAmount,
      orderGroup,
      notes,
    });
    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

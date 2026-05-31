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

function blankContactQuery(group) {
  return {
    orderGroup: group,
    $or: [
      { contactPerson: "" },
      { contactPerson: null },
      { contactPerson: { $exists: false } },
    ],
  };
}

async function getGroupContactPerson(orderGroup) {
  const group = String(orderGroup || "").trim();
  if (!group) return "";

  const source = await Order.findOne({
    orderGroup: group,
    contactPerson: { $nin: ["", null] },
  }).sort({ updatedAt: -1 });

  return source?.contactPerson || "";
}

async function syncGroupContactPerson(orderGroup, contactPerson) {
  const group = String(orderGroup || "").trim();
  const contact = String(contactPerson || "").trim();
  if (!group || !contact) return;

  await Order.updateMany(blankContactQuery(group), {
    $set: { contactPerson: contact },
  });
}

async function syncAllGroupContactPersons() {
  const sources = await Order.find({
    orderGroup: { $nin: ["", null] },
    contactPerson: { $nin: ["", null] },
  }).sort({ updatedAt: -1 });

  const seenGroups = new Set();
  for (const source of sources) {
    const group = String(source.orderGroup || "").trim();
    if (!group || seenGroups.has(group)) continue;
    seenGroups.add(group);
    await syncGroupContactPerson(group, source.contactPerson);
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
    await syncAllGroupContactPersons();
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
      reviewDate,
      amazonLink,
      refundFormDate,
      refundDate,
      originalAmount,
      refundAmount,
      refundStatus,
      contactPerson,
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
    const resolvedContactPerson =
      contactPerson || (await getGroupContactPerson(orderGroup));

    const order = new Order({
      orderId,
      orderDate,
      reviewDate: reviewDate || null,
      amazonLink,
      productImage: finalImage,
      refundFormDate: refundFormDate || null,
      refundDate,
      originalAmount: originalAmount === "" ? null : originalAmount,
      refundAmount: refundAmount === "" ? null : refundAmount,
      refundStatus: refundStatus || "pending",
      contactPerson: resolvedContactPerson,
      orderGroup,
      notes,
    });
    await order.save();
    await syncGroupContactPerson(orderGroup, resolvedContactPerson);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT update order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orderId,
      orderDate,
      reviewDate,
      amazonLink,
      refundFormDate,
      refundDate,
      originalAmount,
      refundAmount,
      refundStatus,
      contactPerson,
      orderGroup,
      notes,
      productImage,
      status,
    } = req.body;

    if (!orderId || !orderDate) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Order Date are required",
      });
    }

    const finalImage = productImage || (await getProductImage(amazonLink));
    const resolvedContactPerson =
      contactPerson || (await getGroupContactPerson(orderGroup));

    const order = await Order.findByIdAndUpdate(
      id,
      {
        orderId,
        orderDate,
        reviewDate: reviewDate || null,
        amazonLink,
        productImage: finalImage,
        refundFormDate: refundFormDate || null,
        refundDate,
        originalAmount: originalAmount === "" ? null : originalAmount,
        refundAmount: refundAmount === "" ? null : refundAmount,
        refundStatus,
        contactPerson: resolvedContactPerson,
        orderGroup,
        notes,
        status,
      },
      { new: true, runValidators: true },
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    await syncGroupContactPerson(orderGroup, resolvedContactPerson);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

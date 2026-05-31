const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/orderController");

router.get("/", ctrl.getAllOrders);
router.post("/", ctrl.createOrder);
router.put("/:id", ctrl.updateOrder);
router.delete("/:id", ctrl.deleteOrder);

module.exports = router;

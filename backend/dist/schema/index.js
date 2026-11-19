"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderItemsRelations = exports.ordersRelations = exports.repairsRelations = exports.productsRelations = exports.usersRelations = exports.notifications = exports.cartItems = exports.paymentEvents = exports.reviews = exports.cancellations = exports.refundHistory = exports.refunds = exports.receipts = exports.invoices = exports.payments = exports.orderItems = exports.orders = exports.repairStatusHistory = exports.repairs = exports.inventoryMovements = exports.products = exports.users = exports.moderationStatusEnum = exports.cancellationStatusEnum = exports.refundStatusEnum = exports.movementTypeEnum = exports.paymentStatusEnum = exports.orderStatusEnum = exports.repairStatusEnum = exports.transactionSourceEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// ---------- Enums ----------
exports.roleEnum = (0, pg_core_1.pgEnum)("role", ["CUSTOMER", "STAFF", "ADMIN"]);
exports.transactionSourceEnum = (0, pg_core_1.pgEnum)("transaction_source", ["ONLINE", "WALK_IN"]);
exports.repairStatusEnum = (0, pg_core_1.pgEnum)("repair_status", [
    "PENDING",
    "APPROVED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
]);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)("order_status", [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
]);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)("payment_status", [
    "UNPAID",
    "PENDING",
    "PROCESSING",
    "PARTIALLY_PAID",
    "PAID",
    "FAILED",
    "EXPIRED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
]);
exports.movementTypeEnum = (0, pg_core_1.pgEnum)("movement_type", [
    "STOCK_IN",
    "STOCK_OUT",
    "SALE",
    "RETURN",
    "DAMAGED",
    "ADJUSTMENT",
]);
exports.refundStatusEnum = (0, pg_core_1.pgEnum)("refund_status", [
    "REQUESTED",
    "UNDER_REVIEW",
    "APPROVED",
    "PROCESSING",
    "REFUNDED",
    "REJECTED",
]);
exports.cancellationStatusEnum = (0, pg_core_1.pgEnum)("cancellation_status", [
    "REQUESTED",
    "APPROVED",
    "REJECTED",
]);
exports.moderationStatusEnum = (0, pg_core_1.pgEnum)("moderation_status", [
    "VISIBLE",
    "HIDDEN",
    "ARCHIVED",
    "PENDING",
    "APPROVED",
    "REJECTED",
]);
// ---------- users ----------
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    fullName: (0, pg_core_1.varchar)("full_name", { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    phoneNumber: (0, pg_core_1.varchar)("phone_number", { length: 50 }),
    profileImage: (0, pg_core_1.text)("profile_image"),
    password: (0, pg_core_1.varchar)("password", { length: 255 }).notNull(),
    role: (0, exports.roleEnum)("role").notNull().default("CUSTOMER"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- products ----------
exports.products = (0, pg_core_1.pgTable)("products", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    sku: (0, pg_core_1.varchar)("sku", { length: 100 }).notNull().unique(),
    productName: (0, pg_core_1.varchar)("product_name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    specifications: (0, pg_core_1.text)("specifications"),
    category: (0, pg_core_1.varchar)("category", { length: 100 }),
    brand: (0, pg_core_1.varchar)("brand", { length: 100 }),
    supplier: (0, pg_core_1.varchar)("supplier", { length: 255 }),
    costPrice: (0, pg_core_1.decimal)("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
    sellingPrice: (0, pg_core_1.decimal)("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
    stock: (0, pg_core_1.integer)("stock").notNull().default(0),
    minimumStock: (0, pg_core_1.integer)("minimum_stock").notNull().default(5),
    imageUrl: (0, pg_core_1.text)("image_url"),
    images: (0, pg_core_1.text)("images"),
    rating: (0, pg_core_1.decimal)("rating", { precision: 3, scale: 2 }).notNull().default("4.5"),
    sold: (0, pg_core_1.integer)("sold").notNull().default(0),
    viewsCount: (0, pg_core_1.integer)("views_count").notNull().default(0),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- inventory_movements ----------
exports.inventoryMovements = (0, pg_core_1.pgTable)("inventory_movements", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    productId: (0, pg_core_1.uuid)("product_id").notNull().references(() => exports.products.id),
    movementType: (0, exports.movementTypeEnum)("movement_type").notNull(),
    quantity: (0, pg_core_1.integer)("quantity").notNull(),
    previousStock: (0, pg_core_1.integer)("previous_stock").notNull(),
    newStock: (0, pg_core_1.integer)("new_stock").notNull(),
    referenceType: (0, pg_core_1.varchar)("reference_type", { length: 50 }),
    referenceId: (0, pg_core_1.uuid)("reference_id"),
    remarks: (0, pg_core_1.text)("remarks"),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- repairs ----------
exports.repairs = (0, pg_core_1.pgTable)("repairs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    referenceNumber: (0, pg_core_1.varchar)("reference_number", { length: 50 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    transactionSource: (0, exports.transactionSourceEnum)("transaction_source").notNull().default("ONLINE"),
    customerName: (0, pg_core_1.varchar)("customer_name", { length: 255 }),
    contactNumber: (0, pg_core_1.varchar)("contact_number", { length: 50 }),
    deviceType: (0, pg_core_1.varchar)("device_type", { length: 100 }).notNull(),
    brand: (0, pg_core_1.varchar)("brand", { length: 100 }),
    model: (0, pg_core_1.varchar)("model", { length: 100 }),
    problemDescription: (0, pg_core_1.text)("problem_description").notNull(),
    imageUrl: (0, pg_core_1.text)("image_url"),
    serviceType: (0, pg_core_1.varchar)("service_type", { length: 100 }),
    technician: (0, pg_core_1.varchar)("technician", { length: 100 }),
    repairCost: (0, pg_core_1.decimal)("repair_cost", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid: (0, pg_core_1.decimal)("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    remainingBalance: (0, pg_core_1.decimal)("remaining_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    preferredDate: (0, pg_core_1.timestamp)("preferred_date"),
    expectedCompletionDate: (0, pg_core_1.timestamp)("expected_completion_date"),
    status: (0, exports.repairStatusEnum)("status").notNull().default("PENDING"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- repair_status_history ----------
exports.repairStatusHistory = (0, pg_core_1.pgTable)("repair_status_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    repairId: (0, pg_core_1.uuid)("repair_id").notNull().references(() => exports.repairs.id),
    status: (0, exports.repairStatusEnum)("status").notNull(),
    remarks: (0, pg_core_1.text)("remarks"),
    updatedBy: (0, pg_core_1.uuid)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- orders ----------
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    orderNumber: (0, pg_core_1.varchar)("order_number", { length: 50 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    customerName: (0, pg_core_1.varchar)("customer_name", { length: 255 }),
    transactionSource: (0, exports.transactionSourceEnum)("transaction_source").notNull().default("ONLINE"),
    totalAmount: (0, pg_core_1.decimal)("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: (0, pg_core_1.decimal)("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    voucherCode: (0, pg_core_1.varchar)("voucher_code", { length: 50 }),
    deliveryMethod: (0, pg_core_1.varchar)("delivery_method", { length: 20 }).default("DELIVERY"),
    deliveryAddress: (0, pg_core_1.text)("delivery_address"),
    paymentStatus: (0, exports.paymentStatusEnum)("payment_status").notNull().default("UNPAID"),
    orderStatus: (0, exports.orderStatusEnum)("order_status").notNull().default("PENDING"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- order_items ----------
exports.orderItems = (0, pg_core_1.pgTable)("order_items", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    orderId: (0, pg_core_1.uuid)("order_id").notNull().references(() => exports.orders.id),
    productId: (0, pg_core_1.uuid)("product_id").notNull().references(() => exports.products.id),
    quantity: (0, pg_core_1.integer)("quantity").notNull(),
    unitPrice: (0, pg_core_1.decimal)("unit_price", { precision: 12, scale: 2 }).notNull(),
    subtotal: (0, pg_core_1.decimal)("subtotal", { precision: 12, scale: 2 }).notNull(),
});
// ---------- payments ----------
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    paymentReference: (0, pg_core_1.varchar)("payment_reference", { length: 50 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    orderId: (0, pg_core_1.uuid)("order_id").references(() => exports.orders.id),
    repairId: (0, pg_core_1.uuid)("repair_id").references(() => exports.repairs.id),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 50 }).notNull(),
    paymentProvider: (0, pg_core_1.varchar)("payment_provider", { length: 50 }),
    amount: (0, pg_core_1.decimal)("amount", { precision: 12, scale: 2 }).notNull(),
    paymentStatus: (0, exports.paymentStatusEnum)("payment_status").notNull().default("PENDING"),
    providerTransactionId: (0, pg_core_1.varchar)("provider_transaction_id", { length: 255 }),
    paidAt: (0, pg_core_1.timestamp)("paid_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- invoices ----------
exports.invoices = (0, pg_core_1.pgTable)("invoices", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    invoiceNumber: (0, pg_core_1.varchar)("invoice_number", { length: 50 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id),
    orderId: (0, pg_core_1.uuid)("order_id").references(() => exports.orders.id),
    repairId: (0, pg_core_1.uuid)("repair_id").references(() => exports.repairs.id),
    totalAmount: (0, pg_core_1.decimal)("total_amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: (0, pg_core_1.decimal)("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    balance: (0, pg_core_1.decimal)("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- receipts ----------
exports.receipts = (0, pg_core_1.pgTable)("receipts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    receiptNumber: (0, pg_core_1.varchar)("receipt_number", { length: 50 }).notNull().unique(),
    paymentId: (0, pg_core_1.uuid)("payment_id").references(() => exports.payments.id),
    invoiceId: (0, pg_core_1.uuid)("invoice_id").references(() => exports.invoices.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- refunds ----------
exports.refunds = (0, pg_core_1.pgTable)("refunds", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    refundReference: (0, pg_core_1.varchar)("refund_reference", { length: 50 }).notNull().unique(),
    paymentId: (0, pg_core_1.uuid)("payment_id").references(() => exports.payments.id),
    orderId: (0, pg_core_1.uuid)("order_id").references(() => exports.orders.id),
    refundAmount: (0, pg_core_1.decimal)("refund_amount", { precision: 12, scale: 2 }).notNull(),
    refundMethod: (0, pg_core_1.varchar)("refund_method", { length: 50 }),
    refundReason: (0, pg_core_1.text)("refund_reason"),
    refundStatus: (0, exports.refundStatusEnum)("refund_status").notNull().default("REQUESTED"),
    processedBy: (0, pg_core_1.uuid)("processed_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- refund_history ----------
exports.refundHistory = (0, pg_core_1.pgTable)("refund_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    refundId: (0, pg_core_1.uuid)("refund_id").notNull().references(() => exports.refunds.id),
    previousStatus: (0, exports.refundStatusEnum)("previous_status"),
    newStatus: (0, exports.refundStatusEnum)("new_status").notNull(),
    remarks: (0, pg_core_1.text)("remarks"),
    updatedBy: (0, pg_core_1.uuid)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- cancellations ----------
exports.cancellations = (0, pg_core_1.pgTable)("cancellations", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    orderId: (0, pg_core_1.uuid)("order_id").references(() => exports.orders.id),
    repairId: (0, pg_core_1.uuid)("repair_id").references(() => exports.repairs.id),
    reason: (0, pg_core_1.text)("reason"),
    cancellationStatus: (0, exports.cancellationStatusEnum)("cancellation_status").notNull().default("REQUESTED"),
    requestedBy: (0, pg_core_1.uuid)("requested_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)("processed_at"),
});
// ---------- reviews ----------
exports.reviews = (0, pg_core_1.pgTable)("reviews", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id),
    productId: (0, pg_core_1.uuid)("product_id").references(() => exports.products.id),
    orderId: (0, pg_core_1.uuid)("order_id").references(() => exports.orders.id),
    repairId: (0, pg_core_1.uuid)("repair_id").references(() => exports.repairs.id),
    rating: (0, pg_core_1.integer)("rating").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }),
    comment: (0, pg_core_1.text)("comment"),
    moderationStatus: (0, exports.moderationStatusEnum)("moderation_status").notNull().default("PENDING"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- payment_events ----------
exports.paymentEvents = (0, pg_core_1.pgTable)("payment_events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    paymentId: (0, pg_core_1.uuid)("payment_id").references(() => exports.payments.id),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(),
    payload: (0, pg_core_1.text)("payload"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- cart_items ----------
exports.cartItems = (0, pg_core_1.pgTable)("cart_items", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id),
    productId: (0, pg_core_1.uuid)("product_id").notNull().references(() => exports.products.id),
    quantity: (0, pg_core_1.integer)("quantity").notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ---------- notifications ----------
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => exports.users.id),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    isRead: (0, pg_core_1.boolean)("is_read").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ---------- relations ----------
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    repairs: many(exports.repairs),
    orders: many(exports.orders),
    payments: many(exports.payments),
    reviews: many(exports.reviews),
    notifications: many(exports.notifications),
}));
exports.productsRelations = (0, drizzle_orm_1.relations)(exports.products, ({ many }) => ({
    orderItems: many(exports.orderItems),
    movements: many(exports.inventoryMovements),
}));
exports.repairsRelations = (0, drizzle_orm_1.relations)(exports.repairs, ({ one, many }) => ({
    user: one(exports.users, { fields: [exports.repairs.userId], references: [exports.users.id] }),
    payments: many(exports.payments),
    invoices: many(exports.invoices),
    statusHistory: many(exports.repairStatusHistory),
}));
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one, many }) => ({
    user: one(exports.users, { fields: [exports.orders.userId], references: [exports.users.id] }),
    items: many(exports.orderItems),
    payments: many(exports.payments),
    invoices: many(exports.invoices),
}));
exports.orderItemsRelations = (0, drizzle_orm_1.relations)(exports.orderItems, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.orderItems.orderId], references: [exports.orders.id] }),
    product: one(exports.products, { fields: [exports.orderItems.productId], references: [exports.products.id] }),
}));
//# sourceMappingURL=index.js.map
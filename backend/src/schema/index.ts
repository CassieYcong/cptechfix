import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const roleEnum = pgEnum("role", ["CUSTOMER", "STAFF", "ADMIN"]);
export const transactionSourceEnum = pgEnum("transaction_source", ["ONLINE", "WALK_IN"]);
export const repairStatusEnum = pgEnum("repair_status", [
  "PENDING",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
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
export const movementTypeEnum = pgEnum("movement_type", [
  "STOCK_IN",
  "STOCK_OUT",
  "SALE",
  "RETURN",
  "DAMAGED",
  "ADJUSTMENT",
]);
export const refundStatusEnum = pgEnum("refund_status", [
  "REQUESTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
  "REFUNDED",
  "REJECTED",
]);
export const cancellationStatusEnum = pgEnum("cancellation_status", [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "VISIBLE",
  "HIDDEN",
  "ARCHIVED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// ---------- users ----------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  profileImage: text("profile_image"),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("CUSTOMER"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- products ----------
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  description: text("description"),
  specifications: text("specifications"),
  category: varchar("category", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }),
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(5),
  imageUrl: text("image_url"),
  images: text("images"),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("4.5"),
  sold: integer("sold").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- inventory_movements ----------
export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  remarks: text("remarks"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- repairs ----------
export const repairs = pgTable("repairs", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id),
  transactionSource: transactionSourceEnum("transaction_source").notNull().default("ONLINE"),
  customerName: varchar("customer_name", { length: 255 }),
  contactNumber: varchar("contact_number", { length: 50 }),
  deviceType: varchar("device_type", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  problemDescription: text("problem_description").notNull(),
  imageUrl: text("image_url"),
  serviceType: varchar("service_type", { length: 100 }),
  technician: varchar("technician", { length: 100 }),
  repairCost: decimal("repair_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  preferredDate: timestamp("preferred_date"),
  expectedCompletionDate: timestamp("expected_completion_date"),
  status: repairStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- repair_status_history ----------
export const repairStatusHistory = pgTable("repair_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  repairId: uuid("repair_id").notNull().references(() => repairs.id),
  status: repairStatusEnum("status").notNull(),
  remarks: text("remarks"),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- orders ----------
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }),
  transactionSource: transactionSourceEnum("transaction_source").notNull().default("ONLINE"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  voucherCode: varchar("voucher_code", { length: 50 }),
  deliveryMethod: varchar("delivery_method", { length: 20 }).default("DELIVERY"),
  deliveryAddress: text("delivery_address"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
  orderStatus: orderStatusEnum("order_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- order_items ----------
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// ---------- payments ----------
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentReference: varchar("payment_reference", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  repairId: uuid("repair_id").references(() => repairs.id),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  providerTransactionId: varchar("provider_transaction_id", { length: 255 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- invoices ----------
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  repairId: uuid("repair_id").references(() => repairs.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- receipts ----------
export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  paymentId: uuid("payment_id").references(() => payments.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- refunds ----------
export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  refundReference: varchar("refund_reference", { length: 50 }).notNull().unique(),
  paymentId: uuid("payment_id").references(() => payments.id),
  orderId: uuid("order_id").references(() => orders.id),
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }).notNull(),
  refundMethod: varchar("refund_method", { length: 50 }),
  refundReason: text("refund_reason"),
  refundStatus: refundStatusEnum("refund_status").notNull().default("REQUESTED"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- refund_history ----------
export const refundHistory = pgTable("refund_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  refundId: uuid("refund_id").notNull().references(() => refunds.id),
  previousStatus: refundStatusEnum("previous_status"),
  newStatus: refundStatusEnum("new_status").notNull(),
  remarks: text("remarks"),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- cancellations ----------
export const cancellations = pgTable("cancellations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  repairId: uuid("repair_id").references(() => repairs.id),
  reason: text("reason"),
  cancellationStatus: cancellationStatusEnum("cancellation_status").notNull().default("REQUESTED"),
  requestedBy: uuid("requested_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// ---------- reviews ----------
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: uuid("product_id").references(() => products.id),
  orderId: uuid("order_id").references(() => orders.id),
  repairId: uuid("repair_id").references(() => repairs.id),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  moderationStatus: moderationStatusEnum("moderation_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- payment_events ----------
export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => payments.id),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- cart_items ----------
export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- notifications ----------
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  repairs: many(repairs),
  orders: many(orders),
  payments: many(payments),
  reviews: many(reviews),
  notifications: many(notifications),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  movements: many(inventoryMovements),
}));

export const repairsRelations = relations(repairs, ({ one, many }) => ({
  user: one(users, { fields: [repairs.userId], references: [users.id] }),
  payments: many(payments),
  invoices: many(invoices),
  statusHistory: many(repairStatusHistory),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  payments: many(payments),
  invoices: many(invoices),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

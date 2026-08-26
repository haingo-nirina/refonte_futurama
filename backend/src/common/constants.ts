/**
 * Valeurs de statut partagees par les modules.
 * Elles doivent rester alignees sur les commentaires de prisma/schema.prisma.
 */

// Order.status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUSES = Object.values(ORDER_STATUS);
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Order.paymentMethod
export const PAYMENT_METHOD = {
  CASH_ON_DELIVERY: 'cash_on_delivery',
  MVOLA: 'mvola',
  ORANGE_MONEY: 'orange_money',
} as const;

export const PAYMENT_METHODS = Object.values(PAYMENT_METHOD);
export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// Review.moderationStatus
export const MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const MODERATION_STATUSES = Object.values(MODERATION_STATUS);
export type ModerationStatus =
  (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS];

/** Un avis ne peut etre modere que vers un etat terminal. */
export const MODERATION_DECISIONS = [
  MODERATION_STATUS.APPROVED,
  MODERATION_STATUS.REJECTED,
];
export type ModerationDecision =
  typeof MODERATION_STATUS.APPROVED | typeof MODERATION_STATUS.REJECTED;

// ProductRelation.relationType
export const RELATION_TYPE = {
  SIMILAR: 'similar',
  FREQUENTLY_BOUGHT_TOGETHER: 'frequently_bought_together',
} as const;

export const RELATION_TYPES = Object.values(RELATION_TYPE);
export type RelationType = (typeof RELATION_TYPE)[keyof typeof RELATION_TYPE];

// User.role
export const USER_ROLE = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
} as const;

export const USER_ROLES = Object.values(USER_ROLE);
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/**
 * Valeurs de statut partagees par les modules.
 * Elles doivent rester alignees sur les commentaires de prisma/schema.prisma.
 */

import {
  FulfillmentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from '@prisma/client';

// Order.status, Order.paymentStatus, Order.fulfillmentMethod, Order.paymentMethod
// et Payment.status sont des enums Prisma : leurs valeurs viennent du client
// genere, reprises ici pour garder un seul point d'entree.
export const ORDER_STATUS = OrderStatus;
export const ORDER_STATUSES = Object.values(OrderStatus);
export const PAYMENT_STATUS = PaymentStatus;
export const PAYMENT_METHOD = PaymentMethod;
export const FULFILLMENT_METHOD = FulfillmentMethod;
export const FULFILLMENT_METHODS = Object.values(FulfillmentMethod);
export const PAYMENT_TRANSACTION_STATUS = PaymentTransactionStatus;
export type {
  FulfillmentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
};

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

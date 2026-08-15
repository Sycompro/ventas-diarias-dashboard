import { pgTable, uuid, text, varchar, timestamp, boolean, numeric, jsonb, date, unique, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ruc: varchar('ruc', { length: 20 }).notNull(),
  subdomain: text('subdomain').notNull(),
  apiTokenEncrypted: text('api_token_encrypted').notNull(),
  apiTokenIv: text('api_token_iv').notNull(),
  apiTokenTag: text('api_token_tag').notNull(),
  timezone: text('timezone').default('America/Lima').notNull(),
  currencySymbol: varchar('currency_symbol', { length: 10 }).default('S/.').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'viewer'] }).default('viewer').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userCompanies = pgTable('user_companies', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: unique('user_company_pk').on(t.userId, t.companyId),
}));

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  externalId: text('external_id').notNull(),
  documentTypeId: varchar('document_type_id', { length: 5 }).notNull(),
  series: text('series').notNull(),
  number: text('number').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 5 }).default('PEN').notNull(),
  sellerName: text('seller_name'),
  customerName: text('customer_name'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  status: text('status').default('active').notNull(),
  rawJson: jsonb('raw_json'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unqCompanyExternal: unique('company_external_unq').on(t.companyId, t.externalId),
}));

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  category: text('category'),
  unitType: text('unit_type'),
});

export const salePayments = pgTable('sale_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  paymentMethodId: varchar('payment_method_id', { length: 5 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'),
});

export const salesGoals = pgTable('sales_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  sellerName: text('seller_name'),
  goalType: text('goal_type').default('sales_amount').notNull(),
  targetValue: numeric('target_value', { precision: 12, scale: 2 }).notNull(),
  periodType: text('period_type', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  recommendation: text('recommendation'),
  relatedEntity: text('related_entity'),
  isRead: boolean('is_read').default(false).notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
});

export const insights = pgTable('insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  data: jsonb('data'),
  validForDate: date('valid_for_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  syncType: text('sync_type').notNull(),
  status: text('status').notNull(),
  documentsSynced: integer('documents_synced').default(0).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(userCompanies),
  sales: many(sales),
  salesGoals: many(salesGoals),
  alerts: many(alerts),
  insights: many(insights),
  syncLogs: many(syncLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(userCompanies),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, { fields: [userCompanies.userId], references: [users.id] }),
  company: one(companies, { fields: [userCompanies.companyId], references: [companies.id] }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  company: one(companies, { fields: [sales.companyId], references: [companies.id] }),
  items: many(saleItems),
  payments: many(salePayments),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
}));

export const salePaymentsRelations = relations(salePayments, ({ one }) => ({
  sale: one(sales, { fields: [salePayments.saleId], references: [sales.id] }),
}));

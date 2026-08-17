import { sqlClient } from '../../config/database.js';

export async function runSchemaMigrations() {
  console.log('[Migration Runner] ⚙️ Verificando esquema de compras/egresos...');
  
  const statements = [
    `CREATE TABLE IF NOT EXISTS "purchases" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "company_id" uuid NOT NULL,
      "external_id" text NOT NULL,
      "number" text NOT NULL,
      "supplier_name" text,
      "total" numeric(12, 2) NOT NULL,
      "currency" varchar(5) DEFAULT 'PEN' NOT NULL,
      "issued_at" timestamp with time zone NOT NULL,
      "status" text DEFAULT 'active' NOT NULL,
      "raw_json" jsonb,
      "synced_at" timestamp with time zone DEFAULT now() NOT NULL,
      "establishment_id" integer,
      CONSTRAINT "company_purchase_external_unq" UNIQUE("company_id","external_id")
    )`,
    `CREATE TABLE IF NOT EXISTS "purchase_payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "purchase_id" uuid NOT NULL,
      "payment_method_id" varchar(5) NOT NULL,
      "amount" numeric(12, 2) NOT NULL,
      "reference" text
    )`,
    `DO $$ BEGIN
      ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$`,
    `DO $$ BEGIN
      ALTER TABLE "purchases" ADD CONSTRAINT "purchases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$`
  ];

  for (const stmt of statements) {
    try {
      await sqlClient.unsafe(stmt);
    } catch (error: any) {
      if (
        !error.message.includes('already exists') && 
        !error.message.includes('duplicada') && 
        !error.message.includes('already exists')
      ) {
        console.warn(`[Migration Runner] Advertencia en sentencia:`, error.message);
      }
    }
  }
  console.log('[Migration Runner] 🟢 Comprobación de esquema finalizada.');
}

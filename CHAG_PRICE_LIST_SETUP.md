# Unified CHAG and custom pricing setup

## 1. Deploy the database migrations

Run these files in order in the Supabase SQL editor:

1. `supabase/migrations/20260816173000_customer_price_lists.sql`
2. `supabase/migrations/20260816190000_unified_pricing.sql`

Both migrations are safe for the existing database. Do not run any earlier
example containing `CUSTOMER_UUID_1` or `PRODUCT_UUID_1`.

## 2. Create the CHAG customer group

Sign in as an administrator or manager and open **Pricing Management**.

1. Select **Customer Groups**.
2. Choose **New Group**.
3. Name: `CHAG Facilities`.
4. Code: `CHAG`.
5. Save the group.

You do not need to add every CHAG facility in advance. When a new facility is
created in CRM, select **CHAG Facilities** in the Customer Groups section. The
same membership can be added or removed later on the customer detail page.

## 3. Create the CHAG contract price list

1. Open **Price Lists** and choose **New Price List**.
2. Name: `CHAG Contract Prices`.
3. Code: `CHAG-CONTRACT`.
4. Type: `Contract`.
5. Priority: `20`.
6. Set the contract start and expiry dates if applicable.
7. Select the new list and add each product's negotiated unit price.
8. Use Minimum Quantity `1` for the base contract price. Add additional rows
   for the same product when quantity tiers apply.

## 4. Assign the list once

1. Open **Assignments**.
2. Select `CHAG Contract Prices`.
3. Target type: `Customer group`.
4. Target: `CHAG Facilities`.
5. Priority: `20`.
6. Save the assignment.

Every current and future customer added to the CHAG group will now receive the
CHAG prices automatically during invoice creation.

## Promotions and other agreements

Use the same workflow for distributor agreements, tenders, hospital networks,
key accounts and promotions. A list can target a customer group or an
individual customer. Lower priority numbers win, so a temporary promotion can
use priority `10` to override a contract at priority `20`. Expired, inactive or
quantity-ineligible prices are ignored automatically.

Invoice lines retain the charged price, price-list identity and assignment
source. Later price-list changes therefore do not alter historical invoices.

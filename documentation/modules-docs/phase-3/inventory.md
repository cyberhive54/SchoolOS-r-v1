# Phase 3 — Inventory Management (Module 18)

## What & Why
Build the Inventory Management module — the system for tracking all school assets, consumables, and stock. Indian K-12 schools manage a wide range of inventory: stationary (pens, paper, chalk), laboratory supplies (chemicals, equipment), furniture (desks, chairs), sports goods, and uniforms. This module ensures optimal stock levels, prevents wastage, and provides a clear audit trail of item issuance to staff or departments. It integrates with the Financial Accounting module to track the value of current assets and depreciation.

## Done looks like
- Admins can manage inventory categories (Stationary, Furniture, Sports, etc.) and item masters
- Support for both consumable (one-time use) and non-consumable (durable) items
- Multi-store/location tracking (Main Store, Lab A, Sports Room)
- Stock entry (Purchase) process with vendor association and purchase dates
- Stock issuance process to staff or departments with quantity tracking
- Real-time stock level monitoring with low-stock alerts
- Stock adjustment (Damage, Lost, Surplus) with mandatory reasoning
- Detailed inventory reports: Current stock, Stock register, Issuance history, Vendor list
- Periodic stock auditing and reconciliation feature
- All pages: skeleton loaders, empty states, and toast feedback for all actions

## Out of scope
- Full e-commerce or point-of-sale (POS) for students (future phase)
- Barcode/QR code scanning integration (Phase 4 enhancement)
- Fixed asset depreciation automation (handled by Financial Accounting via manual JV)
- Multi-school shared inventory (each school has its own stock)

## Tasks

1. **DB migration — inventory tables** — Create migration `034-inventory-management.ts` with:
   - `inventory_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `inventory_items`: `(id UUID PK, school_id UUID NOT NULL, category_id UUID NOT NULL FK inventory_categories, name VARCHAR(200) NOT NULL, code VARCHAR(50) NOT NULL, description TEXT, type ENUM('consumable', 'non_consumable') NOT NULL, unit_of_measure VARCHAR(20) NOT NULL, reorder_level INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, code)`.
   - `inventory_vendors`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(200) NOT NULL, contact_person VARCHAR(100), phone VARCHAR(15), email VARCHAR(100), address TEXT, gst_number VARCHAR(20), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `inventory_stock_entries`: `(id UUID PK, school_id UUID NOT NULL, item_id UUID NOT NULL FK inventory_items, vendor_id UUID NULL FK inventory_vendors, quantity DECIMAL(10,2) NOT NULL, unit_price DECIMAL(12,2) NOT NULL, purchase_date DATE NOT NULL, invoice_number VARCHAR(50), remarks TEXT, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `inventory_issuance`: `(id UUID PK, school_id UUID NOT NULL, item_id UUID NOT NULL FK inventory_items, staff_id UUID NOT NULL FK staff, quantity DECIMAL(10,2) NOT NULL, issuance_date DATE NOT NULL, return_date DATE NULL, status ENUM('issued', 'returned', 'damaged', 'lost') DEFAULT 'issued', remarks TEXT, issued_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `inventory_stock_levels`: `(id UUID PK, school_id UUID NOT NULL, item_id UUID NOT NULL FK inventory_items UNIQUE, current_quantity DECIMAL(10,2) DEFAULT 0, total_issued DECIMAL(10,2) DEFAULT 0, total_received DECIMAL(10,2) DEFAULT 0, last_updated TIMESTAMPTZ DEFAULT now())`.
   - All composite indexes MUST start with `school_id`.

2. **Inventory configuration endpoints** — Manage categories, items, and vendors:
   - `POST /v1/inventory/categories`, `GET /v1/inventory/categories`, `PATCH /v1/inventory/categories/:id` — Categories CRUD. Permission: `inventory.settings.manage`.
   - `POST /v1/inventory/items`, `GET /v1/inventory/items`, `PATCH /v1/inventory/items/:id` — Items CRUD. Permission: `inventory.settings.manage`.
   - `POST /v1/inventory/vendors`, `GET /v1/inventory/vendors`, `PATCH /v1/inventory/vendors/:id` — Vendors CRUD. Permission: `inventory.settings.manage`.

3. **Stock movement endpoints** — Purchase and issuance:
   - `POST /v1/inventory/stock-entries` — Record a purchase/receipt of stock. Body: `{ item_id, vendor_id, quantity, unit_price, purchase_date, invoice_number?, remarks? }`. Updates `inventory_stock_levels.current_quantity`. Permission: `inventory.stock.manage`.
   - `POST /v1/inventory/issuance` — Issue an item to a staff member. Body: `{ item_id, staff_id, quantity, issuance_date, remarks? }`. Checks if stock is available. Updates `inventory_stock_levels`. Permission: `inventory.stock.manage`.
   - `PATCH /v1/inventory/issuance/:id/return` — Return an issued item. Body: `{ return_date, status, remarks? }`. Permission: `inventory.stock.manage`.

4. **Stock level and report endpoints**:
   - `GET /v1/inventory/stock-levels` — Get current quantities of all items. Filters: `category_id`, `low_stock_only=true`. Permission: `inventory.stock.view`.
   - `GET /v1/inventory/reports/stock-register/:itemId` — History of all movements for an item. Permission: `inventory.report.view`.
   - `GET /v1/inventory/reports/issuance-history` — List of all items issued to staff. Filters: `staff_id`, `date_range`. Permission: `inventory.report.view`.

5. **Inventory module NestJS wiring** — Create `InventoryModule` in `backend/src/modules/inventory/`.
   - Entities: `InventoryCategoryEntity`, `InventoryItemEntity`, `InventoryVendorEntity`, `InventoryStockEntryEntity`, `InventoryIssuanceEntity`, `InventoryStockLevelEntity`.
   - Import: `HRModule`, `UsersModule`.
   - Export: `InventoryService`.
   - Register in `AppModule`.

6. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `inventory.settings.manage`, `inventory.stock.view`, `inventory.stock.manage`, `inventory.report.view`.
   - Default assignments: `super_admin`, `admin`, `accountant`, `store_keeper` — all. `principal` — report.view.

7. **Frontend — Inventory Items page** (`/dashboard/inventory/items`) — Admin/Store Keeper view:
   - Table of all items with category, code, and current stock level.
   - Badge indicators for low stock (red) and out of stock.
   - Simple modal for adding/editing items with name, code, and reorder level.

8. **Frontend — Stock Entry & Purchase page** (`/dashboard/inventory/stock-entries`) — Admin/Store Keeper view:
   - Form to record new stock arrival: select item, select vendor, quantity, and unit price.
   - List of recent stock entries with search and filters.

9. **Frontend — Item Issuance page** (`/dashboard/inventory/issuance`) — Admin/Store Keeper view:
   - Form to issue items: select staff member, select item, quantity.
   - List of active issuances with "Mark as Returned" quick action.
   - Skeleton loader and empty state.

10. **Frontend — Inventory Reports page** (`/dashboard/inventory/reports`) — Principal/Admin view:
    - Sidebar with report links: Low Stock, Stock Register, Issuance History.
    - Grid/Table views of inventory data.
    - Export to CSV/PDF buttons.

11. **Seed inventory data** — Update `seed.ts` to:
    - Create 2 categories: Stationary, Sports.
    - Create 3 items: Whiteboard Markers, Football, A4 Paper Rim.
    - Record initial stock entries for all items.
    - Record 1 issuance of "Whiteboard Markers" to a demo teacher.

## Relevant files
- `backend/src/modules/inventory/`
- `backend/src/modules/inventory/entities/*.entity.ts`
- `backend/src/database/migrations/034-inventory-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/inventory/items/page.tsx`
- `frontend/src/app/(dashboard)/inventory/stock-entries/page.tsx`
- `frontend/src/app/(dashboard)/inventory/issuance/page.tsx`
- `frontend/src/app/(dashboard)/inventory/reports/page.tsx`
- `frontend/src/components/modules/inventory/LowStockWidget.tsx`

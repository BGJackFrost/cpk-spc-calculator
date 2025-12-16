# Fix Notes - Phase 118

## 1. Supervisor Dashboard - DONE
- Removed useRealtimeUpdates hook that was causing infinite loop
- Removed recharts AreaChart that was regenerating data on every render
- Used useRef to track initialization state
- Replaced sparkline chart with simple progress bar for OEE
- Fixed generateSparklineData to be called once per machine during initialization
- Dashboard now loads and displays correctly without infinite loop errors

## 2. Spare Parts - Tạo đơn hàng - DONE
- Fixed database schema mismatch:
  - Added missing columns (subtotal, tax, shipping) to purchase_orders table
  - Created missing purchase_order_items table
- Updated createPurchaseOrder mutation to include subtotal field
- Đơn hàng PO-202512-0001 đã được tạo thành công

## 3. Maintenance Dashboard - Edit/Delete Work Order - DONE
- Added DropdownMenu with "Sửa Work Order" and "Xóa Work Order" options
- Added Edit Work Order Dialog with fields: Title, Machine, Assignee, Status, Priority, Due Date
- Added AlertDialog for delete confirmation
- Added updateWorkOrder and deleteWorkOrder mutations in maintenanceRouter
- Fixed TypeScript errors in sparePartsStockMovements schema usage

## TypeScript Errors Fixed
- Fixed column names in sparePartsStockMovements (totalValue -> totalCost, reference -> referenceNumber, notes -> reason)
- Fixed quantity type (string -> int) in inventory updates
- Fixed null check for status in maintenanceRouter
- Created use-toast.ts hook for toast notifications

## Next Steps
- [ ] Tạo trang CRUD quản lý Kỹ thuật viên (KTV)

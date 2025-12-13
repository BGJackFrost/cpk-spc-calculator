# Phân tích lỗi Mapping dropdown

## Vấn đề
- Dropdown Mapping không hiển thị options khi click
- Dropdown bị disabled khi chưa chọn Station

## Nguyên nhân
1. `availableMappings` được lọc dựa trên `selectedProduct` và `selectedStation`
2. Logic lọc yêu cầu:
   - `m.productCode === selectedProduct` (so sánh với product code như "PCB-001")
   - `m.stationName === stationName` (so sánh với station name)
   - `m.isActive === 1`

3. Vấn đề có thể là:
   - Không có mapping nào trong database
   - Mapping không khớp với product code hoặc station name
   - Mapping bị inactive (isActive !== 1)

## Giải pháp
1. Kiểm tra bảng product_station_mappings trong database
2. Tạo mapping mẫu cho các sản phẩm và trạm có sẵn

# Phân tích giao diện - Phase 74

## Quan sát từ Dashboard:

### 1. Menu hiện tại hoạt động tốt:
- Top Navigation: Dashboard, SPC/CPK, MMS, Production, AI, License, System
- Sidebar: SPC Overview, Analysis, Quality, Realtime SPC
- Các menu con: Dashboard, Realtime Monitoring, Machine Overview, Status Report, SPC Plan Overview, Supervisor Dashboard

### 2. Các trang IoT hiện tại:
- `/iot-dashboard` - trong System menu
- `/iot-realtime-dashboard` - trong SPC > Realtime SPC
- `/iot-gateway` - trong MMS > Config
- `/mqtt-connections` - không có trong menu
- `/opcua-connections` - không có trong menu
- `/sensor-dashboard` - không có trong menu

### 3. Cần thực hiện:
- [x] Tạo IoT system mới trong TopNavigation
- [ ] Di chuyển các menu IoT sang system mới
- [ ] Thêm hamburger menu cho mobile
- [ ] Rà soát AI pages

### 4. Mobile UX:
- TopNavigation có class `hidden lg:flex` - ẩn trên mobile
- SidebarTrigger có class `lg:hidden` - chỉ hiện trên mobile
- Cần thêm dropdown menu cho mobile để chọn system

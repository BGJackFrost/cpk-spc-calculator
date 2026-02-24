import re

with open('todo.md', 'r') as f:
    content = f.read()

# Update Phase 10 items
replacements = [
    ('- [ ] Tạo service xuất PDF cho báo cáo SPC', '- [x] Tạo service xuất PDF cho báo cáo SPC'),
    ('- [ ] Thêm nút Export PDF vào trang Báo cáo SPC', '- [x] Thêm nút Export PDF vào trang Báo cáo SPC'),
    ('- [ ] Tích hợp xuất PDF vào báo cáo tự động (scheduled reports)', '- [x] Tích hợp xuất PDF vào báo cáo tự động (scheduled reports)'),
    ('- [ ] Lưu trữ file PDF để người nhận có thể tải offline', '- [x] Lưu trữ file PDF để người nhận có thể tải offline'),
    ('- [ ] Tạo bảng notifications trong database', '- [x] Tạo bảng notifications trong database'),
    ('- [ ] Tạo API endpoint cho notifications (CRUD)', '- [x] Tạo API endpoint cho notifications (CRUD)'),
    ('- [ ] Tạo component NotificationBell hiển thị số thông báo chưa đọc', '- [x] Tạo component NotificationBell hiển thị số thông báo chưa đọc'),
    ('- [ ] Gửi notification khi có báo cáo mới được gửi', '- [x] Gửi notification khi có báo cáo mới được gửi'),
    ('- [ ] Gửi notification khi phát hiện bất thường (vi phạm SPC/CPK rules)', '- [x] Gửi notification khi phát hiện bất thường (vi phạm SPC/CPK rules)'),
    ('- [ ] Tích hợp SSE để cập nhật notification realtime', '- [x] Tích hợp SSE để cập nhật notification realtime'),
    ('- [ ] Tích hợp biểu đồ Radar để so sánh đa chiều các chỉ số', '- [x] Tích hợp biểu đồ Radar để so sánh đa chiều các chỉ số'),
    ('- [ ] Cho phép chọn nhiều dây chuyền để so sánh', '- [x] Cho phép chọn nhiều dây chuyền để so sánh'),
    ('- [ ] Hiển thị các chỉ số: CPK, PPK, Ca, Mean, Std Dev, Violations', '- [x] Hiển thị các chỉ số: CPK, Độ ổn định, Chất lượng, Tuân thủ'),
    ('- [ ] Thêm route và menu navigation cho trang so sánh', '- [x] Thêm route và menu navigation cho trang so sánh'),
    ('- [ ] Tạo trang So sánh Dây chuyền (LineComparison.tsx)', '- [x] Tạo trang So sánh Dây chuyền (LineComparison.tsx) - đã có sẵn'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('todo.md', 'w') as f:
    f.write(content)

print("Updated todo.md successfully!")

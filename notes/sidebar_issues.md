# Các trang bị mất menu sidebar

## Trang không có sidebar (theo thiết kế - OK)
1. `/setup` - Trang khởi tạo hệ thống (wizard, không cần sidebar)
2. `/local-login` - Trang đăng nhập local (không cần sidebar)
3. `/change-password` - Trang đổi mật khẩu bắt buộc (không cần sidebar)

## Trang có sidebar (OK)
1. `/database-settings` - Có sidebar
2. `/company-info` - Có sidebar

## Trang bị lỗi
1. `/connection-manager` - Lỗi: `(databaseTypes || []).map is not a function`
   - Cần sửa lỗi trong ConnectionManager.tsx dòng 621

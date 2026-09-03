# 🎮 PUBG PC Tactical Wiki & Interactive Hub

Trang Bách khoa toàn thư tương tác hiện đại, bảng sát thương và công cụ so sánh vũ khí chuẩn **PUBG: BATTLEGROUNDS (PC)**, thiết kế theo phong cách **Tactical Military Dark HUD**, hỗ trợ song ngữ **Tiếng Việt 🇻🇳 & English 🇬🇧**, tối ưu hóa 100% để triển khai trực tiếp lên **GitHub Pages**.

---

## 🌟 Tính Năng Nổi Bật

1. **⚡ Zero-Build & GitHub Pages Ready**:
   - Chạy 100% Client-side bằng HTML5, CSS3 hiện đại (CSS Variables, Flexbox, Grid) và Vanilla JavaScript.
   - Không phụ thuộc backend, không cần cài đặt Node.js hay build step. Chỉ cần push lên GitHub và kích hoạt GitHub Pages.
2. **🌐 Đa Ngôn Ngữ Song Ngữ (i18n)**:
   - Hỗ trợ đầy đủ **Tiếng Việt** và **Tiếng Anh**.
   - Nút chuyển ngôn ngữ trực quan `[🇻🇳 VN | 🇬🇧 EN]` trên thanh điều hướng, tự động lưu lựa chọn vào `localStorage`.
3. **🎯 Bảng Tính Sát Thương & TTK Tương Tác (Interactive Calculator)**:
   - Mô phỏng chính xác sát thương theo từng bộ phận (Đầu, Ngực, Bụng, Tay/Chân).
   - Tính toán theo từng cấp Giáp & Mũ (Không giáp, Cấp 1 -30%, Cấp 2 -40%, Cấp 3 -55%).
   - Đo lường số viên đạn kết liễu và thời gian hạ gục (Time-to-Kill tính theo mili-giây).
   - Ma trận sát thương tổng hợp chi tiết cho từng loại súng.
4. **⚖️ Công Cụ So Sánh Súng Trực Diện (Side-by-Side Comparison)**:
   - So sánh 2 đến 3 khẩu súng cùng lúc.
   - Tự động phát hiện và làm nổi bật (highlight) thông số vượt trội (Damage, RPM, DPS, Vận tốc đạn, Thời gian nạp đạn, TTK).
5. **🗺️ Khung Sườn Hệ Thống Toàn Diện**:
   - **Bản đồ chiến thuật (Maps)**: Erangel, Miramar, Taego, Rondo, Vikendi, Deston.
   - **Trang bị sinh tồn (Equipment)**: Mũ, Giáp, Ba lô, Vật phẩm y tế & Tăng lực.
   - **Cơ chế trò chơi (Mechanics)**: Quy luật sát thương vòng bo Bluezone, đạn đạo và zeroing.

---

## 📁 Cấu Trúc Thư Mục

```
pubg-pc-wiki/
├── index.html                  # Trang chủ Hub (Dashboard & lối tắt nhanh)
├── weapons.html                # Module 1: Thư viện vũ khí, bộ lọc nâng cao & modal tính sát thương
├── compare.html                # Module 1+: Công cụ so sánh súng đối đầu trực tiếp
├── maps.html                   # Module 2: Bản đồ chiến thuật và cơ chế đặc trưng
├── equipment.html              # Module 3: Trang bị, giáp chống đạn và đồ cứu thương
├── mechanics.html              # Module 4: Cơ chế vòng bo Bluezone và vật lý đạn đạo
├── css/
│   ├── main.css                # Design tokens Dark HUD, layout navbar, reset
│   ├── components.css          # Buttons cắt góc quân sự, badges loại đạn, modal, slider
│   ├── weapons.css             # Thẻ súng, thanh chỉ số, bảng sát thương tương tác
│   └── compare.css             # Bảng đối đầu so sánh trực diện
├── js/
│   ├── i18n.js                 # Engine xử lý đa ngôn ngữ (VI/EN), binding DOM
│   ├── data-loader.js          # Fetch và cache dữ liệu static JSON
│   ├── damage-calculator.js    # Thuật toán tính sát thương và TTK chuẩn PUBG PC
│   ├── weapons.js              # Logic lọc, tìm kiếm, sắp xếp và modal vũ khí
│   ├── compare.js              # Logic công cụ so sánh súng
│   └── main.js                 # Điều hướng, mobile drawer và phím tắt
├── data/
│   ├── i18n.json               # Từ điển song ngữ hoàn chỉnh
│   ├── weapons.json            # Dữ liệu chi tiết 24+ vũ khí PUBG PC
│   ├── attachments.json        # Dữ liệu phụ kiện và chỉ số giảm giật
│   ├── maps.json               # Dữ liệu các bản đồ
│   └── equipment.json          # Dữ liệu mũ, giáp, ba lô, hồi máu
└── README.md                   # Tài liệu hướng dẫn sử dụng và triển khai
```

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Testing)

Do trình duyệt chặn tính năng `fetch()` file JSON cục bộ theo giao thức `file:///` (CORS policy), bạn cần mở dự án thông qua một HTTP server cục bộ siêu nhẹ:

### Cách 1: Dùng Python (Có sẵn trên hầu hết máy tính)
```bash
python -m http.server 8000
```
Sau đó truy cập: `http://localhost:8000`

### Cách 2: Dùng Node.js
```bash
npx serve .
```

### Cách 3: Dùng Live Server trên Visual Studio Code
- Nhấp chuột phải vào `index.html` và chọn **"Open with Live Server"**.


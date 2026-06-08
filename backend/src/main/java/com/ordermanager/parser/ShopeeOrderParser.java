package com.ordermanager.parser;

import com.ordermanager.entity.Order;
import com.ordermanager.entity.OrderItem;
import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class ShopeeOrderParser implements OrderImportParser {

    // 👉 dùng lowercase hết để tránh lỗi header
    private static final String COL_ORDER_CODE = "mã đơn hàng";
    private static final String COL_TRACKING_CODE = "mã vận đơn";
    private static final String COL_ORDER_DATE = "ngày đặt hàng";
    private static final String COL_ORDER_STATUS = "trạng thái đơn hàng";
    private static final String COL_PRODUCT_NAME = "tên sản phẩm";
    private static final String COL_VARIANT_NAME = "tên phân loại hàng";
    private static final String COL_QUANTITY = "số lượng";
    private static final String COL_CARRIER = "đơn vị vận chuyển";
    private static final String COL_CUSTOMER_NAME = "người mua";
    private static final String COL_PHONE = "số điện thoại";
    private static final String COL_PROVINCE = "tỉnh/thành phố";
    private static final String COL_NOTE = "ghi chú";
    private static final String COL_CANCEL_REASON = "lý do hủy";
    private static final String COL_BUYER_COMMENT = "nhận xét từ người mua";
    private static final String COL_RETURN_STATUS = "trạng thái trả hàng/hoàn tiền";
    private static final String COL_DELIVERY_TIME = "thời gian giao hàng";

    @Override
    public String getPlatform() {
        return "Shopee";
    }

    @Override
    public List<Order> parse(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        List<Map<String, String>> rows;

        if (filename != null && filename.endsWith(".csv")) {
            rows = parseCsvToMaps(file);
        } else {
            rows = parseExcelToMaps(file);
        }

        return groupRowsIntoOrders(rows);
    }

    private List<Order> groupRowsIntoOrders(List<Map<String, String>> rows) {
        Map<String, Order> orderMap = new LinkedHashMap<>();

        for (Map<String, String> row : rows) {
            String trackingCode = getVal(row, COL_TRACKING_CODE);
            if (trackingCode == null) continue;

            Order order = orderMap.get(trackingCode);

            if (order == null) {
                order = Order.builder()
                        .trackingCode(trackingCode)
                        .shopOrderCode(getVal(row, COL_ORDER_CODE))
                        .platform("Shopee")
                        .status(mapShopeeStatus(getVal(row, COL_ORDER_STATUS)))
                        .customerName(getVal(row, COL_CUSTOMER_NAME))
                        .customerPhone(getVal(row, COL_PHONE))
                        .shippingCarrier(getVal(row, COL_CARRIER))
                        .province(getVal(row, COL_PROVINCE))
                        .note(getVal(row, COL_NOTE))
                        .cancelReason(getVal(row, COL_CANCEL_REASON))
                        .buyerNote(getVal(row, COL_BUYER_COMMENT))
                        .returnRefundStatus(getVal(row, COL_RETURN_STATUS))
                        .orderDate(parseDate(getVal(row, COL_ORDER_DATE)))
                        .deliveredAt(parseDate(getVal(row, COL_DELIVERY_TIME)))
                        .importSource(ImportSource.FILE)
                        .items(new ArrayList<>())
                        .build();

                orderMap.put(trackingCode, order);
            }

            String productName = getVal(row, COL_PRODUCT_NAME);
            if (productName != null) {
                OrderItem item = OrderItem.builder()
                        .order(order)
                        .productName(productName)
                        .variantName(getVal(row, COL_VARIANT_NAME))
                        .quantity(parseInt(getVal(row, COL_QUANTITY), 1))
                        .checked(false)
                        .build();

                order.getItems().add(item);
            }

            buildProductInfo(order);
        }

        return new ArrayList<>(orderMap.values());
    }

    private void buildProductInfo(Order order) {
        StringBuilder sb = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(item.getProductName());
            if (item.getVariantName() != null) {
                sb.append(" (").append(item.getVariantName()).append(")");
            }
            sb.append(" x").append(item.getQuantity());
        }
        order.setProductInfo(sb.toString());
    }

    // ================= PARSE FILE =================

    private List<Map<String, String>> parseExcelToMaps(MultipartFile file) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            List<String> headers = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headers.add(normalize(headerRow.getCell(i).getStringCellValue()));
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> map = new HashMap<>();

                for (int j = 0; j < headers.size(); j++) {
                    map.put(headers.get(j), getCellString(row.getCell(j)));
                }

                result.add(map);
            }
        }
        return result;
    }

    private List<Map<String, String>> parseCsvToMaps(MultipartFile file) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) return result;

            if (headerLine.startsWith("\uFEFF")) {
                headerLine = headerLine.substring(1);
            }

            String[] headersRaw = headerLine.split(",");
            String[] headers = Arrays.stream(headersRaw)
                    .map(this::normalize)
                    .toArray(String[]::new);

            String line;
            while ((line = reader.readLine()) != null) {
                String[] values = line.split(",");
                Map<String, String> map = new HashMap<>();

                for (int i = 0; i < headers.length && i < values.length; i++) {
                    map.put(headers[i], values[i].trim());
                }

                result.add(map);
            }
        }
        return result;
    }

    // ================= UTILS =================

    private String normalize(String s) {
        if (s == null) return null;
        return s.trim().toLowerCase();
    }

    private String getVal(Map<String, String> row, String key) {
        return row.get(normalize(key));
    }

    private int parseInt(String val, int def) {
        try {
            return (int) Double.parseDouble(val);
        } catch (Exception e) {
            return def;
        }
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toString();
                }
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case BLANK -> null;
            default -> null;
        };
    }

    private LocalDateTime parseDate(String val) {
        if (val == null) return null;

        DateTimeFormatter[] formats = {
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"),
                DateTimeFormatter.ISO_LOCAL_DATE_TIME
        };

        for (DateTimeFormatter f : formats) {
            try {
                return LocalDateTime.parse(val, f);
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ================= FIX CHÍNH NẰM Ở ĐÂY =================

    private OrderStatus mapShopeeStatus(String status) {
        if (status == null) return OrderStatus.PENDING;

        String s = status.toLowerCase().trim();

        // ✅ ĐÃ GIAO / HOÀN THÀNH (Shopee viết rất dài)
        if (s.contains("đã nhận được hàng")
                || s.contains("hoàn thành")
                || s.contains("giao thành công")
                || s.contains("đã giao")) {
            return OrderStatus.COMPLETED;
        }

        // ❌ HUỶ
        if (s.contains("hủy")) {
            return OrderStatus.CANCELLED;
        }

        // 🔁 TRẢ HÀNG
        if (s.contains("trả hàng")) {
            return OrderStatus.RETURNED;
        }

        // 🚚 ĐANG GIAO
        if (s.contains("đang giao")) {
            return OrderStatus.SHIPPING;
        }

        return OrderStatus.PENDING;
    }
}
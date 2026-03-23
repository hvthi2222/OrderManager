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

/**
 * Parser for Shopee order export CSV/Excel files.
 * Groups rows with the same shop order code into one Order with multiple OrderItems.
 */
@Component
public class ShopeeOrderParser implements OrderImportParser {

    // Shopee CSV column names (Vietnamese)
    private static final String COL_ORDER_CODE = "Mã đơn hàng";
    private static final String COL_TRACKING_CODE = "Mã vận đơn";
    private static final String COL_ORDER_DATE = "Ngày đặt hàng";
    private static final String COL_ORDER_STATUS = "Trạng Thái Đơn Hàng";
    private static final String COL_PRODUCT_NAME = "Tên sản phẩm";
    private static final String COL_VARIANT_NAME = "Tên phân loại hàng";
    private static final String COL_QUANTITY = "Số lượng";
    private static final String COL_CARRIER = "Đơn Vị Vận Chuyển";
    private static final String COL_CUSTOMER_NAME = "Tên Người nhận";
    private static final String COL_PHONE = "Số điện thoại";
    private static final String COL_PROVINCE = "Tỉnh/Thành phố";
    private static final String COL_NOTE = "Ghi chú";
    private static final String COL_CANCEL_REASON = "Lý do hủy";
    private static final String COL_BUYER_COMMENT = "Nhận xét từ Người mua";
    private static final String COL_RETURN_STATUS = "Trạng thái Trả hàng/Hoàn tiền";
    private static final String COL_DELIVERY_TIME = "Thời gian giao hàng";

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

    /**
     * Group parsed rows by shop order code to create orders with multiple items.
     */
    private List<Order> groupRowsIntoOrders(List<Map<String, String>> rows) {
        // LinkedHashMap preserves insertion order
        Map<String, Order> orderMap = new LinkedHashMap<>();

        for (Map<String, String> row : rows) {
            String orderCode = getVal(row, COL_ORDER_CODE);
            String trackingCode = getVal(row, COL_TRACKING_CODE);

            if (trackingCode == null || trackingCode.isEmpty()) continue;

            // Use tracking code as the key (unique per shipment)
            Order order = orderMap.get(trackingCode);

            if (order == null) {
                order = Order.builder()
                        .trackingCode(trackingCode)
                        .shopOrderCode(orderCode)
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

            // Create OrderItem for each row
            String productName = getVal(row, COL_PRODUCT_NAME);
            if (productName != null && !productName.isEmpty()) {
                OrderItem item = OrderItem.builder()
                        .order(order)
                        .productName(productName)
                        .variantName(getVal(row, COL_VARIANT_NAME))
                        .quantity(parseInt(getVal(row, COL_QUANTITY), 1))
                        .checked(false)
                        .build();
                order.getItems().add(item);
            }

            // Build productInfo text for backward compatibility
            buildProductInfo(order);
        }

        return new ArrayList<>(orderMap.values());
    }

    /**
     * Build productInfo text from items list for backward compatibility.
     */
    private void buildProductInfo(Order order) {
        StringBuilder sb = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(item.getProductName());
            if (item.getVariantName() != null && !item.getVariantName().isEmpty()) {
                sb.append(" (").append(item.getVariantName()).append(")");
            }
            sb.append(" x").append(item.getQuantity());
        }
        order.setProductInfo(sb.toString());
    }

    // ========== CSV/Excel parsing helpers ==========

    private List<Map<String, String>> parseExcelToMaps(MultipartFile file) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return result;

            // Build header index map
            List<String> headers = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headers.add(getCellString(headerRow.getCell(i)));
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    String header = headers.get(j);
                    if (header != null) {
                        map.put(header, getCellString(row.getCell(j)));
                    }
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

            // Handle BOM character
            if (headerLine.startsWith("\uFEFF")) {
                headerLine = headerLine.substring(1);
            }

            String[] headers = splitCsvLine(headerLine);

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] values = splitCsvLine(line);

                Map<String, String> map = new HashMap<>();
                for (int i = 0; i < headers.length && i < values.length; i++) {
                    map.put(headers[i].trim(), values[i].trim());
                }
                result.add(map);
            }
        }
        return result;
    }

    /**
     * Split CSV line handling quoted fields with commas inside.
     */
    private String[] splitCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString().replace("\"", "").trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString().replace("\"", "").trim());
        return result.toArray(new String[0]);
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
            default -> null;
        };
    }

    private String getVal(Map<String, String> row, String colName) {
        String val = row.get(colName);
        if (val == null || val.isEmpty() || val.equals("-")) return null;
        return val;
    }

    private int parseInt(String val, int defaultVal) {
        if (val == null || val.isEmpty()) return defaultVal;
        try {
            return (int) Double.parseDouble(val);
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    private LocalDateTime parseDate(String val) {
        if (val == null || val.isEmpty()) return null;
        try {
            // Try common Shopee date formats
            DateTimeFormatter[] formatters = {
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
                    DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"),
                    DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
                    DateTimeFormatter.ISO_LOCAL_DATE_TIME
            };
            for (DateTimeFormatter fmt : formatters) {
                try {
                    return LocalDateTime.parse(val, fmt);
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        return null;
    }

    /**
     * Map Shopee order status text to OrderStatus enum.
     */
    private OrderStatus mapShopeeStatus(String shopeeStatus) {
        if (shopeeStatus == null || shopeeStatus.isEmpty()) return OrderStatus.PENDING;
        return switch (shopeeStatus.trim()) {
            case "Hoàn thành" -> OrderStatus.COMPLETED;
            case "Đã hủy" -> OrderStatus.CANCELLED;
            case "Đã giao" -> OrderStatus.COMPLETED;
            case "Trả hàng/Hoàn tiền" -> OrderStatus.RETURNED;
            default -> OrderStatus.PENDING; // Chờ xác nhận, Chờ gửi, etc.
        };
    }
}

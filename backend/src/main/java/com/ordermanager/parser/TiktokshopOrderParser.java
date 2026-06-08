package com.ordermanager.parser;

import com.ordermanager.entity.Order;
import com.ordermanager.entity.OrderItem;
import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class TiktokshopOrderParser implements OrderImportParser {

    private static final String COL_ORDER_ID = "Order ID";
    private static final String COL_ORDER_STATUS = "Order Status";
    private static final String COL_PRODUCT_NAME = "Product Name";
    private static final String COL_VARIANT_NAME = "Variation";
    private static final String COL_QUANTITY = "Quantity";
    private static final String COL_ORDER_DATE = "Created Time";
    private static final String COL_DELIVERY_TIME = "Delivered Time";
    private static final String COL_TRACKING_CODE = "Tracking ID";
    private static final String COL_CARRIER = "Shipping Provider Name";
    private static final String COL_NOTE = "Buyer Message";
    private static final String COL_BUYER_COMMENT = "Buyer Message";
    private static final String COL_CANCEL_REASON = "Cancel Reason";
    private static final String COL_RETURN_STATUS = "Cancelation/Return Type";
    private static final String COL_CUSTOMER_NAME = "Recipient";
    private static final String COL_PHONE = "Phone #";
    private static final String COL_PROVINCE = "Province";

    @Override
    public String getPlatform() {
        return "TikTok Shop";
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

        if (rows == null || rows.isEmpty()) {
            throw new RuntimeException("File import rỗng hoặc không đọc được. Vui lòng kiểm tra file.");
        }

        // capture detected headers (first row original headers if available)
        Set<String> detectedHeaders;
        String headerMeta = rows.get(0).get("__ORIGINAL_HEADERS__");
        if (headerMeta != null) {
            detectedHeaders = new LinkedHashSet<>(Arrays.asList(headerMeta.split(", ")));
        } else {
            detectedHeaders = rows.get(0).keySet();
        }

        for (Map<String, String> row : rows) {
                String orderCode = getVal(row,
                    COL_ORDER_ID,
                    "Order ID",
                    "Order Status",
                    "Order Substatus",
                    "Order ID",
                    "order id",
                    "order code",
                    "order number",
                    "order no",
                    "order_number",
                    "order_code"
                );
                String trackingCode = getVal(row,
                    COL_TRACKING_CODE,
                    "Tracking ID",
                    "Tracking ID",
                    "Tracking ID",
                    "tracking id",
                    "tracking_id",
                    "tracking number",
                    "tracking code",
                    "track number",
                    "tracking no",
                    "tracking"
                );
            String key = trackingCode != null ? trackingCode : orderCode;
            if (key == null) continue;

            Order order = orderMap.get(key);

            if (order == null) {
                order = Order.builder()
                    .trackingCode(key)
                    .shopOrderCode(orderCode)
                    .platform("TikTok Shop")
                    .status(mapTikTokStatus(getVal(row,
                        COL_ORDER_STATUS,
                        "Order Status",
                        "Order Substatus",
                        "Order Substatus",
                        "order status",
                        "status",
                        "order state",
                        "order substatus",
                        "order_substatus"
                    )))
                    .customerName(getVal(row,
                        COL_CUSTOMER_NAME,
                        "Recipient",
                        "Recipient",
                        "Recipient",
                        "recipient",
                        "recipient name",
                        "buyer name",
                        "buyer",
                        "customer name"
                    ))
                    .customerPhone(getVal(row,
                        COL_PHONE,
                        "Phone #",
                        "Phone #",
                        "Phone #",
                        "recipient phone",
                        "phone #",
                        "phone",
                        "customer phone",
                        "buyer phone"
                    ))
                    .shippingCarrier(getVal(row,
                        COL_CARRIER,
                        "Shipping Provider Name",
                        "Shipping Provider Name",
                        "shipping provider name",
                        "shipping provider",
                        "delivery (shipping)",
                        "shipping",
                        "carrier",
                        "shipping carrier"
                    ))
                    .province(getVal(row,
                        COL_PROVINCE,
                        "Province",
                        "Province",
                        "province",
                        "province/city",
                        "city",
                        "country"
                    ))
                    .note(getVal(row,
                        COL_NOTE,
                        "Buyer Message",
                        "Buyer Message",
                        "buyer message",
                        "note",
                        "buyer message",
                        "buyer note",
                        "remark",
                        "seller note"
                    ))
                    .cancelReason(getVal(row,
                        COL_CANCEL_REASON,
                        "Cancel Reason",
                        "Cancelation/Return Type",
                        "Cancelation/Return Type",
                        "cancel reason",
                        "cancel by",
                        "cancel_by",
                        "cancel remark",
                        "cancellation reason",
                        "cancel reason/remark"
                    ))
                    .buyerNote(getVal(row,
                        COL_BUYER_COMMENT,
                        "Buyer Message",
                        "Buyer Message",
                        "buyer comment",
                        "buyer notes",
                        "comment from buyer",
                        "buyer message"
                    ))
                    .returnRefundStatus(getVal(row,
                        COL_RETURN_STATUS,
                        "Cancelation/Return Type",
                        "Cancelation/Return Type",
                        "return status",
                        "refund status",
                        "cancelation/return type"
                    ))
                    .orderDate(parseDate(getVal(row,
                        COL_ORDER_DATE,
                        "Created Time",
                        "Created Time",
                        "created time",
                        "created at",
                        "order created time",
                        "order date",
                        "order time",
                        "paid time"
                    )))
                    .deliveredAt(parseDate(getVal(row,
                        COL_DELIVERY_TIME,
                        "Delivered Time",
                        "Delivered Time",
                        "delivered time",
                        "delivery time",
                        "delivered at",
                        "delivered_date",
                        "shipped time",
                        "shipped at"
                    )))
                    .importSource(ImportSource.FILE)
                    .items(new ArrayList<>())
                    .build();

                orderMap.put(key, order);
            }

            String productName = getVal(row, COL_PRODUCT_NAME, "product name", "product", "product title", "item name");
            if (productName != null) {
                OrderItem item = OrderItem.builder()
                        .order(order)
                        .productName(productName)
                        .variantName(getVal(row, COL_VARIANT_NAME, "variation", "variant", "sku attributes", "item variation"))
                        .quantity(parseInt(getVal(row, COL_QUANTITY, "quantity", "qty", "quantity ordered"), 1))
                        .checked(false)
                        .build();

                order.getItems().add(item);
            }

            buildProductInfo(order);
        }

        if (orderMap.isEmpty()) {
            String headersStr = String.join(", ", detectedHeaders);
            throw new RuntimeException("Không tìm thấy đơn hợp lệ trong file. Header phát hiện: " + headersStr);
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

    private List<Map<String, String>> parseExcelToMaps(MultipartFile file) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new RuntimeException("Sheet đầu tiên trong file Excel không tồn tại.");
            }

            int lastRow = sheet.getLastRowNum();
            if (lastRow < 1) {
                throw new RuntimeException("File Excel không có đủ dòng dữ liệu (cần ít nhất 1 dòng header + 1 dòng dữ liệu).");
            }

            Row headerRow = null;
            int headerRowIndex = -1;
            List<String> headerOriginals = null;

            for (int i = 0; i <= Math.min(lastRow, 10); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                headerOriginals = buildHeaderOriginals(row);
                long realHeaders = headerOriginals.stream()
                        .filter(h -> !h.startsWith("column_"))
                        .count();
                if (realHeaders >= 2) {
                    headerRow = row;
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRow == null) {
                headerRow = sheet.getRow(0);
                headerRowIndex = 0;
                headerOriginals = buildHeaderOriginals(headerRow);
            }

            int colCount = headerOriginals.size();
            int dataStart = headerRowIndex + 1;
            boolean headerMetaWritten = false;

            for (int i = dataStart; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                if (i == 1) continue;

                Map<String, String> map = new HashMap<>();
                int rowColCount = row.getLastCellNum();
                for (int j = 0; j < colCount; j++) {
                    String origKey = headerOriginals.get(j);
                    String val = (j < rowColCount) ? getCellString(row.getCell(j)) : null;
                    map.put(origKey, val);
                    String norm = normalize(origKey);
                    if (norm != null && !norm.isBlank() && !map.containsKey(norm)) {
                        map.put(norm, val);
                    }
                }

                boolean hasTrackingOrOrder = getVal(map,
                        "Tracking ID", "tracking id", "tracking",
                        "Order ID", "order id", "order", "order id"
                    ) != null;

                if (!hasTrackingOrOrder) continue;

                if (!headerMetaWritten) {
                    map.put("__ORIGINAL_HEADERS__", String.join(", ", headerOriginals));
                    headerMetaWritten = true;
                }
                result.add(map);
            }

            if (result.isEmpty()) {
                throw new RuntimeException(
                        "Không tìm thấy dòng dữ liệu nào có mã đơn hàng hoặc mã vận đơn. "
                        + "Header phát hiện: " + String.join(", ", headerOriginals));
            }
        }
        return result;
    }

    private List<String> buildHeaderOriginals(Row headerRow) {
        List<String> headerOriginals = new ArrayList<>();
        int cellCount = headerRow.getLastCellNum();
        for (int i = 0; i < cellCount; i++) {
            Cell cell = headerRow.getCell(i);
            String raw = getCellString(cell);
            String original = raw != null ? raw.trim() : "";
            if (original.isBlank()) {
                original = "column_" + i;
            }
            if (original.startsWith("\uFEFF")) {
                original = original.substring(1);
            }
            original = original.trim();
            if (original.isBlank()) {
                original = "column_" + i;
            }
            String unique = original;
            int dup = 1;
            while (headerOriginals.contains(unique)) {
                unique = original + "_" + dup++;
            }
            headerOriginals.add(unique);
        }
        return headerOriginals;
    }

    private List<Map<String, String>> parseCsvToMaps(MultipartFile file) throws Exception {
        List<Map<String, String>> result = new ArrayList<>();
        List<String> headerOriginals = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) return result;

            if (headerLine.startsWith("\uFEFF")) {
                headerLine = headerLine.substring(1);
            }

            String[] headersRaw = splitCsvLine(headerLine);
            for (int i = 0; i < headersRaw.length; i++) {
                String raw = headersRaw[i];
                String original = raw != null ? raw.trim() : "";
                if (original.isBlank()) {
                    original = "column_" + i;
                }
                String unique = original;
                int dup = 1;
                while (headerOriginals.contains(unique)) {
                    unique = original + "_" + dup++;
                }
                headerOriginals.add(unique);
            }
            String[] headers = headerOriginals.toArray(new String[0]);

            String line;
            boolean headerMetaWritten = false;
            while ((line = reader.readLine()) != null) {
                String[] values = splitCsvLine(line);
                Map<String, String> map = new HashMap<>();

                for (int i = 0; i < headers.length && i < values.length; i++) {
                    String origKey = headers[i];
                    String val = values[i].trim();
                    map.put(origKey, val);
                    String norm = normalize(origKey);
                    if (norm != null && !norm.isBlank() && !map.containsKey(norm)) {
                        map.put(norm, val);
                    }
                }

                boolean hasTrackingOrOrder = getVal(map,
                        "Tracking ID", "tracking id", "tracking",
                        "Order ID", "order id", "order", "order id"
                    ) != null;

                if (!hasTrackingOrOrder) continue;

                if (!headerMetaWritten) {
                    map.put("__ORIGINAL_HEADERS__", String.join(", ", headerOriginals));
                    headerMetaWritten = true;
                }
                result.add(map);
            }
        }

        if (result.isEmpty()) {
            throw new RuntimeException(
                    "Không tìm thấy dòng dữ liệu nào có mã đơn hàng hoặc mã vận đơn. "
                    + "Header phát hiện: " + String.join(", ", headerOriginals));
        }
        return result;
    }

    private String normalize(String s) {
        if (s == null) return null;
        return s.trim().toLowerCase();
    }

    private boolean isLikelyHeaderRow(Row row) {
        if (row == null) return false;
        int knownHeadingCount = 0;
        int nonEmptyCount = 0;
        int firstCell = row.getFirstCellNum() >= 0 ? row.getFirstCellNum() : 0;
        int lastCell = row.getLastCellNum();

        for (int j = firstCell; j < lastCell; j++) {
            String raw = getCellString(row.getCell(j));
            if (raw != null && !raw.isBlank()) {
                nonEmptyCount++;
                if (isKnownHeader(raw)) {
                    knownHeadingCount++;
                }
            }
        }

        return knownHeadingCount >= 1 && nonEmptyCount >= 2;
    }

    private boolean isKnownHeader(String value) {
        if (value == null) return false;
        String norm = normalize(value);
        return norm.contains("order")
                || norm.contains("tracking")
                || norm.contains("recipient")
                || norm.contains("buyer")
                || norm.contains("phone")
                || norm.contains("product")
                || norm.contains("quantity")
                || norm.contains("sku")
                || norm.contains("status")
                || norm.contains("province")
                || norm.contains("address")
                || norm.contains("shipping")
                || norm.contains("time")
                || norm.contains("amount")
                || norm.contains("price")
                || norm.contains("payment")
                || norm.contains("fulfillment")
                || norm.contains("warehouse")
                || norm.contains("delivery")
                || norm.contains("cancel")
                || norm.contains("variation")
                || norm.contains("carrier")
                || norm.contains("username")
                || norm.contains("country")
                || norm.contains("district")
                || norm.contains("commune")
                || norm.contains("weight")
                || norm.contains("category");
    }

    private String getVal(Map<String, String> row, String... keys) {
        for (String key : keys) {
            if (key == null) continue;
            // Try exact match first (case-sensitive)
            if (row.containsKey(key)) {
                String v = row.get(key);
                if (v != null && !v.isBlank()) return v.trim();
            }
            // Then try normalized key
            String norm = normalize(key);
            if (norm != null && row.containsKey(norm)) {
                String v = row.get(norm);
                if (v != null && !v.isBlank()) return v.trim();
            }
        }
        return null;
    }

    private String[] splitCsvLine(String line) {
        if (line == null) return new String[0];
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (c == ',' && !inQuotes) {
                values.add(current.toString());
                current.setLength(0);
                continue;
            }
            current.append(c);
        }
        values.add(current.toString());
        return values.toArray(new String[0]);
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
            case FORMULA -> {
                CellType resultType = cell.getCachedFormulaResultType();
                if (resultType == CellType.STRING) {
                    yield cell.getRichStringCellValue().getString().trim();
                }
                if (resultType == CellType.NUMERIC) {
                    if (DateUtil.isCellDateFormatted(cell)) {
                        yield cell.getLocalDateTimeCellValue().toString();
                    }
                    yield String.valueOf((long) cell.getNumericCellValue());
                }
                if (resultType == CellType.BOOLEAN) {
                    yield String.valueOf(cell.getBooleanCellValue());
                }
                yield null;
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
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private OrderStatus mapTikTokStatus(String status) {
        if (status == null) return OrderStatus.PENDING;

        String s = status.toLowerCase().trim();

        if (s.contains("đã hủy")
                || s.contains("cancelled")
                || s.contains("canceled")
                || s.contains("hủy")) {
            return OrderStatus.CANCELLED;
        }

        if (s.contains("đã hoàn tất")
                || s.contains("delivered")
                || s.contains("completed")
                || s.contains("received")
                || s.contains("hoàn thành")
                || s.contains("finished")) {
            return OrderStatus.COMPLETED;
        }

        if (s.contains("đã vận chuyển")
                || s.contains("shipped")
                || s.contains("in transit")
                || s.contains("đang giao")) {
            return OrderStatus.SHIPPING;
        }

        if (s.contains("cần vận chuyển")
                || s.contains("pending")
                || s.contains("awaiting")
                || s.contains("chờ")
                || s.contains("đang chờ")) {
            return OrderStatus.PENDING;
        }

        return OrderStatus.PENDING;
    }
}

package com.ordermanager.enums;

public enum OrderStatus {
    PENDING,         // Chờ gửi
    PACKED,          // Đã đóng gói
    SHIPPING,        // Đang giao
    COMPLETED,       // Hoàn thành (đã giao)
    CANCELLED,       // Đã hủy
    RETURNED,        // Đã hoàn
    RETURN_CHECKED   // Đã kiểm tra hoàn
}

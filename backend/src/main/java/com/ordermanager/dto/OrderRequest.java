package com.ordermanager.dto;

import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrderRequest {
    @NotBlank(message = "Tracking code is required")
    private String trackingCode;

    private String platform;
    private String customerName;
    private String customerPhone;
    private String productInfo;
    private LocalDateTime orderDate;
    private OrderStatus status;
    private ImportSource importSource;
}

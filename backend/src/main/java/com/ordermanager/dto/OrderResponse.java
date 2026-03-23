package com.ordermanager.dto;

import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.enums.ReturnEvaluation;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private Long id;
    private String trackingCode;
    private String shopOrderCode;
    private String platform;
    private OrderStatus status;
    private String customerName;
    private String customerPhone;
    private String productInfo;
    private String shippingCarrier;
    private String note;
    private String packedByName;
    private Long packedById;
    private LocalDateTime orderDate;
    private LocalDateTime packedAt;
    private LocalDateTime returnedAt;
    private LocalDateTime deliveredAt;
    private ImportSource importSource;
    private LocalDateTime createdAt;
    private boolean hasVideo;
    private String packVideoUrl;
    private String returnVideoUrl;
    private Boolean packVideoFraudDetected;
    private List<String> packVideoFraudMessages;
    private LocalDateTime packVideoFraudAnalyzedAt;
    private Boolean returnVideoFraudDetected;
    private List<String> returnVideoFraudMessages;
    private LocalDateTime returnVideoFraudAnalyzedAt;
    private ReturnEvaluation returnEvaluation;
    private String returnNote;
    private String returnRefundStatus;
    private String cancelReason;
    private String buyerNote;
    private String province;
    private Double predictionRisk;
    private List<OrderItemResponse> items;
}

package com.ordermanager.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScanResponse {
    private boolean valid;
    private String alertType;   // null, "ALREADY_PACKED", "NOT_FOUND", "WRONG_TYPE"
    private String alertMessage;
    private OrderResponse order;
}

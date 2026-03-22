package com.ordermanager.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderItemResponse {
    private Long id;
    private String productName;
    private String variantName;
    private Integer quantity;
    private Boolean checked;
}

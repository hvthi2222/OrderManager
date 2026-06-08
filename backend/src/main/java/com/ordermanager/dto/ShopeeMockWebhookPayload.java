package com.ordermanager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopeeMockWebhookPayload {

    private Integer code;

    @JsonProperty("shop_id")
    private Long shopId;

    private Map<String, Object> data;
}


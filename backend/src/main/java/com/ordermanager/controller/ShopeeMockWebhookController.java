package com.ordermanager.controller;

import com.ordermanager.dto.OrderResponse;
import com.ordermanager.dto.ShopeeMockWebhookPayload;
import com.ordermanager.service.ShopeeMockWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mock/shopee")
@RequiredArgsConstructor
public class ShopeeMockWebhookController {

    private final ShopeeMockWebhookService shopeeMockWebhookService;

    @PostMapping("/order-status")
    public ResponseEntity<OrderResponse> mockOrderStatus(@RequestBody ShopeeMockWebhookPayload payload) {
        OrderResponse response = shopeeMockWebhookService.handleOrderStatus(payload);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/return-status")
    public ResponseEntity<OrderResponse> mockReturnStatus(@RequestBody ShopeeMockWebhookPayload payload) {
        OrderResponse response = shopeeMockWebhookService.handleReturnStatus(payload);
        return ResponseEntity.ok(response);
    }
}


package com.ordermanager.service;

import com.ordermanager.dto.OrderResponse;
import com.ordermanager.dto.ShopeeMockWebhookPayload;
import com.ordermanager.entity.Order;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.exception.ResourceNotFoundException;
import com.ordermanager.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ShopeeMockWebhookService {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderResponse handleOrderStatus(ShopeeMockWebhookPayload payload) {
        Map<String, Object> data = payload.getData();
        if (data == null) {
            throw new IllegalArgumentException("Missing data field in payload");
        }

        String orderSn = (String) data.get("ordersn");
        if (orderSn == null || orderSn.isBlank()) {
            throw new IllegalArgumentException("Missing ordersn in data");
        }

        Order order = orderRepository.findByShopOrderCode(orderSn)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for ordersn: " + orderSn));

        String statusText = (String) data.get("status");
        if (statusText != null && !statusText.isBlank()) {
            OrderStatus mapped = mapShopeeStatus(statusText);
            order.setStatus(mapped);

            LocalDateTime updateTime = extractUpdateTime(data);
            if (updateTime != null) {
                if (mapped == OrderStatus.COMPLETED) {
                    order.setDeliveredAt(updateTime);
                } else if (mapped == OrderStatus.RETURNED || mapped == OrderStatus.RETURN_CHECKED) {
                    order.setReturnedAt(updateTime);
                }
            }
        }

        orderRepository.save(order);
        return orderService.toResponse(order);
    }

    public OrderResponse handleReturnStatus(ShopeeMockWebhookPayload payload) {
        Map<String, Object> data = payload.getData();
        if (data == null) {
            throw new IllegalArgumentException("Missing data field in payload");
        }

        String orderSn = (String) data.get("ordersn");
        if (orderSn == null || orderSn.isBlank()) {
            throw new IllegalArgumentException("Missing ordersn in data");
        }

        Order order = orderRepository.findByShopOrderCode(orderSn)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for ordersn: " + orderSn));

        String refundStatus = (String) data.get("refund_status");
        String reason = (String) data.get("reason");
        String buyerNote = (String) data.get("buyer_note");

        if (refundStatus != null && !refundStatus.isBlank()) {
            order.setReturnRefundStatus(refundStatus);
        }
        if (reason != null && !reason.isBlank()) {
            order.setCancelReason(reason);
        }
        if (buyerNote != null && !buyerNote.isBlank()) {
            order.setBuyerNote(buyerNote);
        }

        // If Shopee also sends a status field, reuse order status mapping
        String statusText = (String) data.get("status");
        if (statusText != null && !statusText.isBlank()) {
            OrderStatus mapped = mapShopeeStatus(statusText);
            order.setStatus(mapped);
        } else if (refundStatus != null && !refundStatus.isBlank()) {
            // Simple heuristic: any final refund status moves order to RETURNED
            order.setStatus(OrderStatus.RETURNED);
        }

        LocalDateTime updateTime = extractUpdateTime(data);
        if (updateTime != null) {
            order.setReturnedAt(updateTime);
        }

        orderRepository.save(order);
        return orderService.toResponse(order);
    }

    private LocalDateTime extractUpdateTime(Map<String, Object> data) {
        Object ts = data.get("update_time");
        if (ts instanceof Number number) {
            long epochSeconds = number.longValue();
            return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.systemDefault());
        }
        return null;
    }

    private OrderStatus mapShopeeStatus(String shopeeStatus) {
        if (shopeeStatus == null || shopeeStatus.isEmpty()) return OrderStatus.PENDING;
        return switch (shopeeStatus.trim()) {
            case "Hoàn thành" -> OrderStatus.COMPLETED;
            case "Đã hủy" -> OrderStatus.CANCELLED;
            case "Đã giao" -> OrderStatus.COMPLETED;
            case "Trả hàng" -> OrderStatus.RETURNED;
            case "Đang trả hàng" -> OrderStatus.RETURN_CHECKED;
            default -> OrderStatus.PENDING;
        };
    }
}


package com.ordermanager.service;

import com.ordermanager.dto.OrderResponse;
import com.ordermanager.dto.ScanResponse;
import com.ordermanager.entity.Order;
import com.ordermanager.entity.User;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.enums.ReturnEvaluation;
import com.ordermanager.exception.ResourceNotFoundException;
import com.ordermanager.repository.OrderRepository;
import com.ordermanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PackingService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;

    /**
     * Validate barcode scan for packing (sending orders).
     * Returns alert info if the scan is problematic.
     */
    public ScanResponse scanForPacking(String trackingCode) {
        var optOrder = orderRepository.findByTrackingCode(trackingCode);

        if (optOrder.isEmpty()) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("NOT_FOUND")
                    .alertMessage("Mã vận đơn không tồn tại trong hệ thống: " + trackingCode)
                    .build();
        }

        Order order = optOrder.get();

        if (order.getStatus() == OrderStatus.COMPLETED) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("ALREADY_PACKED")
                    .alertMessage("Đơn hàng đã được đóng hàng (Hoàn thành) trước đó! Mã: " + trackingCode)
                    .order(orderService.toResponse(order))
                    .build();
        }

        if (order.getStatus() == OrderStatus.RETURNED || order.getStatus() == OrderStatus.RETURN_CHECKED) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("WRONG_TYPE")
                    .alertMessage("Đây là đơn hoàn, không phải đơn gửi! Mã: " + trackingCode)
                    .order(orderService.toResponse(order))
                    .build();
        }

        return ScanResponse.builder()
                .valid(true)
                .order(orderService.toResponse(order))
                .build();
    }

    /**
     * Validate barcode scan for return processing.
     */
    public ScanResponse scanForReturn(String trackingCode) {
        var optOrder = orderRepository.findByTrackingCode(trackingCode);

        if (optOrder.isEmpty()) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("NOT_FOUND")
                    .alertMessage("Mã vận đơn không tồn tại trong hệ thống: " + trackingCode)
                    .build();
        }

        Order order = optOrder.get();

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("ALREADY_PACKED")
                    .alertMessage("Đơn hoàn đã được kiểm tra (Đã hủy) trước đó! Mã: " + trackingCode)
                    .order(orderService.toResponse(order))
                    .build();
        }

        if (order.getStatus() != OrderStatus.RETURNED && order.getStatus() != OrderStatus.RETURN_CHECKED) {
            return ScanResponse.builder()
                    .valid(false)
                    .alertType("WRONG_TYPE")
                    .alertMessage("Đây không phải đơn hoàn! Trạng thái hiện tại: " + order.getStatus())
                    .order(orderService.toResponse(order))
                    .build();
        }

        return ScanResponse.builder()
                .valid(true)
                .order(orderService.toResponse(order))
                .build();
    }

    /**
     * Confirm packing: PENDING → PACKED
     */
    @Transactional
    public OrderResponse confirmPacking(String trackingCode) {
        Order order = orderRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + trackingCode));

        User currentUser = getCurrentUser();
        order.setStatus(OrderStatus.COMPLETED);
        order.setPackedBy(currentUser);
        order.setPackedAt(LocalDateTime.now());

        return orderService.toResponse(orderRepository.save(order));
    }

    /**
     * Confirm return check: RETURNED → CANCELLED with evaluation
     */
    @Transactional
    public OrderResponse confirmReturnCheck(String trackingCode, ReturnEvaluation evaluation, String note) {
        Order order = orderRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + trackingCode));

        User currentUser = getCurrentUser();
        order.setStatus(OrderStatus.CANCELLED);
        order.setPackedBy(currentUser);
        order.setPackedAt(LocalDateTime.now());
        order.setReturnEvaluation(evaluation != null ? evaluation : ReturnEvaluation.NORMAL);
        order.setReturnNote(note);

        return orderService.toResponse(orderRepository.save(order));
    }

    /**
     * Get statistics for the current user today.
     */
    public java.util.Map<String, Long> getTodayStats() {
        User currentUser = getCurrentUser();
        java.time.LocalDateTime start = java.time.LocalDate.now().atStartOfDay();
        java.time.LocalDateTime end = java.time.LocalDate.now().atTime(java.time.LocalTime.MAX);

        long packedToday = orderRepository.countByStatusAndEmployeeAndUpdatedAt(OrderStatus.COMPLETED, currentUser.getId(), start, end)
                + orderRepository.countByStatusAndEmployeeAndUpdatedAt(OrderStatus.PACKED, currentUser.getId(), start, end);
        
        long returnedToday = orderRepository.countByStatusAndEmployeeAndUpdatedAt(OrderStatus.CANCELLED, currentUser.getId(), start, end)
                + orderRepository.countByStatusAndEmployeeAndUpdatedAt(OrderStatus.RETURN_CHECKED, currentUser.getId(), start, end);

        return java.util.Map.of(
                "packedToday", packedToday,
                "returnedToday", returnedToday
        );
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }
}

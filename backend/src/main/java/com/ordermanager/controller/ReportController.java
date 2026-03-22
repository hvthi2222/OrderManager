package com.ordermanager.controller;

import com.ordermanager.enums.OrderStatus;
import com.ordermanager.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final OrderRepository orderRepository;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = startDate != null
                ? LocalDate.parse(startDate).atStartOfDay()
                : LocalDate.now().atStartOfDay();
        LocalDateTime end = endDate != null
                ? LocalDate.parse(endDate).atTime(LocalTime.MAX)
                : LocalDate.now().atTime(LocalTime.MAX);

        boolean isFiltered = startDate != null || endDate != null;
        Map<String, Object> summary = new HashMap<>();

        if (isFiltered) {
            // Report mode: Respect date filters for performance tracking
            long completedCount = orderRepository.countByUpdatedAtAndDateRange(OrderStatus.COMPLETED, start, end)
                    + orderRepository.countByUpdatedAtAndDateRange(OrderStatus.PACKED, start, end);
            long cancelledCount = orderRepository.countByUpdatedAtAndDateRange(OrderStatus.CANCELLED, start, end)
                    + orderRepository.countByUpdatedAtAndDateRange(OrderStatus.RETURN_CHECKED, start, end);

            summary.put("totalPending", orderRepository.countByStatusAndDateRange(OrderStatus.PENDING, start, end));
            summary.put("totalCompleted", completedCount);
            summary.put("totalReturned", orderRepository.countByStatusAndDateRange(OrderStatus.RETURNED, start, end));
            summary.put("totalCancelled", cancelledCount);
        } else {
            // Dashboard mode: Snapshot (All Time)
            summary.put("totalPending", orderRepository.countByStatus(OrderStatus.PENDING));
            summary.put("totalCompleted", orderRepository.countByStatusIn(List.of(OrderStatus.COMPLETED, OrderStatus.PACKED)));
            summary.put("totalReturned", orderRepository.countByStatus(OrderStatus.RETURNED));
            summary.put("totalCancelled", orderRepository.countByStatusIn(List.of(OrderStatus.CANCELLED, OrderStatus.RETURN_CHECKED)));
        }
        
        summary.put("startDate", start);
        summary.put("endDate", end);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/employees")
    public ResponseEntity<List<Map<String, Object>>> getEmployeeStats(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = startDate != null
                ? LocalDate.parse(startDate).atStartOfDay()
                : LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime end = endDate != null
                ? LocalDate.parse(endDate).atTime(LocalTime.MAX)
                : LocalDate.now().atTime(LocalTime.MAX);

        List<Object[]> results = orderRepository.countByEmployeeAndDateRange(start, end);
        List<Map<String, Object>> stats = results.stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("employeeId", row[0]);
                    map.put("employeeName", row[1]);
                    map.put("orderCount", row[2]);
                    return map;
                })
                .toList();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/platforms")
    public ResponseEntity<List<Map<String, Object>>> getPlatformStats(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = startDate != null
                ? LocalDate.parse(startDate).atStartOfDay()
                : LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime end = endDate != null
                ? LocalDate.parse(endDate).atTime(LocalTime.MAX)
                : LocalDate.now().atTime(LocalTime.MAX);

        List<Object[]> results = orderRepository.countByPlatformAndDateRange(start, end);
        List<Map<String, Object>> stats = results.stream()
                .map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("platform", row[0]);
                    map.put("orderCount", row[1]);
                    return map;
                })
                .toList();

        return ResponseEntity.ok(stats);
    }
}

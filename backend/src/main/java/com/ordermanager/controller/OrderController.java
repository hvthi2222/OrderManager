package com.ordermanager.controller;

import com.ordermanager.dto.OrderRequest;
import com.ordermanager.dto.OrderResponse;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.service.AuditLogService;
import com.ordermanager.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hasVideo,
            @RequestParam(required = false) LocalDateTime startDate,
            @RequestParam(required = false) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        PageRequest pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(orderService.getOrders(status, platform, search, hasVideo, startDate, endDate, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody OrderRequest request,
            HttpServletRequest httpRequest
    ) {
        OrderResponse response = orderService.createOrder(request);
        auditLogService.log("CREATE_ORDER", request.getTrackingCode(),
                Map.of("platform", request.getPlatform() != null ? request.getPlatform() : ""), httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrderResponse> updateOrder(
            @PathVariable Long id,
            @RequestBody OrderRequest request,
            HttpServletRequest httpRequest
    ) {
        OrderResponse response = orderService.updateOrder(id, request);
        auditLogService.log("UPDATE_ORDER", String.valueOf(id), null, httpRequest);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteOrder(
            @PathVariable Long id,
            HttpServletRequest httpRequest
    ) {
        orderService.deleteOrder(id);
        auditLogService.log("DELETE_ORDER", String.valueOf(id), null, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> importOrders(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String platform,
            HttpServletRequest httpRequest
    ) {
        Map<String, Object> result = orderService.importOrders(file, platform);
        auditLogService.log("IMPORT_ORDERS", file.getOriginalFilename(),
                Map.of("platform", platform != null ? platform : "",
                        "total", result.get("totalRecords"),
                        "success", result.get("successCount")), httpRequest);
        return ResponseEntity.ok(result);
    }
}

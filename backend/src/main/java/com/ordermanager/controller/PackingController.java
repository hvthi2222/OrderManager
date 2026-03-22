package com.ordermanager.controller;

import com.ordermanager.dto.OrderItemResponse;
import com.ordermanager.dto.OrderResponse;
import com.ordermanager.dto.ScanResponse;
import com.ordermanager.service.AuditLogService;
import com.ordermanager.service.OrderService;
import com.ordermanager.service.PackingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/packing")
@RequiredArgsConstructor
public class PackingController {

    private final PackingService packingService;
    private final OrderService orderService;
    private final AuditLogService auditLogService;

    @PostMapping("/scan")
    public ResponseEntity<ScanResponse> scan(
            @RequestParam String trackingCode,
            @RequestParam(defaultValue = "PACK") String mode
    ) {
        ScanResponse response = mode.equals("RETURN")
                ? packingService.scanForReturn(trackingCode)
                : packingService.scanForPacking(trackingCode);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/confirm")
    public ResponseEntity<OrderResponse> confirm(
            @RequestParam String trackingCode,
            @RequestParam(defaultValue = "PACK") String mode,
            @RequestParam(required = false) String evaluation,
            @RequestParam(required = false) String returnNote,
            HttpServletRequest httpRequest
    ) {
        OrderResponse response;
        if (mode.equals("RETURN")) {
            com.ordermanager.enums.ReturnEvaluation eval = null;
            if (evaluation != null && !evaluation.isBlank()) {
                eval = com.ordermanager.enums.ReturnEvaluation.valueOf(evaluation);
            }
            response = packingService.confirmReturnCheck(trackingCode, eval, returnNote);
        } else {
            response = packingService.confirmPacking(trackingCode);
        }

        String action = mode.equals("RETURN") ? "CONFIRM_RETURN" : "CONFIRM_PACK";
        java.util.Map<String, Object> details = evaluation != null
                ? java.util.Map.of("evaluation", evaluation, "returnNote", returnNote != null ? returnNote : "")
                : null;
        auditLogService.log(action, trackingCode, details, httpRequest);

        return ResponseEntity.ok(response);
    }

    /**
     * Toggle checked status of an order item (for packing checklist).
     */
    @PostMapping("/check-item/{itemId}")
    public ResponseEntity<OrderItemResponse> checkItem(@PathVariable Long itemId) {
        return ResponseEntity.ok(orderService.toggleItemChecked(itemId));
    }

    /**
     * Get statistics for the current user today.
     */
    @GetMapping("/stats-today")
    public ResponseEntity<java.util.Map<String, Long>> getTodayStats() {
        return ResponseEntity.ok(packingService.getTodayStats());
    }
}


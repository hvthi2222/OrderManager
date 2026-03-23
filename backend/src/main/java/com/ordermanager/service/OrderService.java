package com.ordermanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordermanager.dto.OrderItemResponse;
import com.ordermanager.dto.OrderRequest;
import com.ordermanager.dto.OrderResponse;
import com.ordermanager.entity.Order;
import com.ordermanager.entity.OrderItem;
import com.ordermanager.entity.User;
import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.exception.BusinessException;
import com.ordermanager.exception.ResourceNotFoundException;
import com.ordermanager.parser.OrderParserFactory;
import com.ordermanager.repository.OrderItemRepository;
import com.ordermanager.repository.OrderRepository;
import com.ordermanager.repository.UserRepository;
import com.ordermanager.util.DataMaskingUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final OrderParserFactory parserFactory;
    private final PredictionService predictionService;

    public Page<OrderResponse> getOrders(String statusParam, String platform, String search, Boolean hasVideo,
                                          LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<Order> spec = Specification.where(null);

        if (statusParam != null && !statusParam.isBlank()) {
            String[] parts = statusParam.split(",");
            List<OrderStatus> statuses = java.util.Arrays.stream(parts)
                    .map(String::trim)
                    .map(OrderStatus::valueOf)
                    .collect(Collectors.toList());
            if (statuses.size() == 1) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), statuses.get(0)));
            } else {
                spec = spec.and((root, query, cb) -> root.get("status").in(statuses));
            }
        }
        if (platform != null && !platform.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("platform"), platform));
        }
        if (search != null && !search.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(root.get("trackingCode"), "%" + search + "%"),
                    cb.like(root.get("customerName"), "%" + search + "%")
            ));
        }
        if (hasVideo != null) {
            if (hasVideo) {
                spec = spec.and((root, query, cb) -> cb.isNotEmpty(root.get("videos")));
            } else {
                spec = spec.and((root, query, cb) -> cb.isEmpty(root.get("videos")));
            }
        }
        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }
        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }

        return orderRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public OrderResponse getOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
        return toResponse(order);
    }

    public OrderResponse createOrder(OrderRequest request) {
        if (orderRepository.existsByTrackingCode(request.getTrackingCode())) {
            throw new BusinessException("Tracking code already exists: " + request.getTrackingCode());
        }

        Order order = Order.builder()
                .trackingCode(request.getTrackingCode())
                .platform(request.getPlatform())
                .status(request.getStatus() != null ? request.getStatus() : OrderStatus.PENDING)
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .productInfo(request.getProductInfo())
                .orderDate(request.getOrderDate() != null ? request.getOrderDate() : LocalDateTime.now())
                .importSource(request.getImportSource() != null ? request.getImportSource() : ImportSource.MANUAL)
                .build();

        return toResponse(orderRepository.save(order));
    }

    public OrderResponse updateOrder(Long id, OrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));

        if (request.getCustomerName() != null) order.setCustomerName(request.getCustomerName());
        if (request.getCustomerPhone() != null) order.setCustomerPhone(request.getCustomerPhone());
        if (request.getProductInfo() != null) order.setProductInfo(request.getProductInfo());
        if (request.getPlatform() != null) order.setPlatform(request.getPlatform());
        if (request.getStatus() != null) order.setStatus(request.getStatus());

        return toResponse(orderRepository.save(order));
    }

    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found: " + id);
        }
        orderRepository.deleteById(id);
    }

    /**
     * Import orders using platform-specific parser.
     * Parser handles grouping rows by order code (multi-item support).
     */
    public Map<String, Object> importOrders(MultipartFile file, String platform) {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int skipCount = 0;

        try {
            List<Order> parsedOrders = parserFactory.getParser(platform).parse(file);

            for (int i = 0; i < parsedOrders.size(); i++) {
                Order order = parsedOrders.get(i);
                try {
                    // Skip if tracking code already exists
                    if (orderRepository.existsByTrackingCode(order.getTrackingCode())) {
                        skipCount++;
                        continue;
                    }
                    orderRepository.save(order);
                    successCount++;
                } catch (Exception e) {
                    errors.add("Đơn " + order.getTrackingCode() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new BusinessException("Lỗi đọc file: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalRecords", successCount + skipCount + errors.size());
        result.put("successCount", successCount);
        result.put("skipCount", skipCount);
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        return result;
    }

    /**
     * Toggle checked status of an order item (for packing checklist).
     */
    public OrderItemResponse toggleItemChecked(Long itemId) {
        OrderItem item = orderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found: " + itemId));
        item.setChecked(!item.getChecked());
        orderItemRepository.save(item);
        return toItemResponse(item);
    }

    public OrderResponse toResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems() != null
                ? order.getItems().stream().map(this::toItemResponse).collect(Collectors.toList())
                : List.of();

        // Extract video URLs and fraud info
        String packVideoUrl = null;
        String returnVideoUrl = null;
        Boolean packVideoFraudDetected = null;
        List<String> packVideoFraudMessages = null;
        LocalDateTime packVideoFraudAnalyzedAt = null;
        Boolean returnVideoFraudDetected = null;
        List<String> returnVideoFraudMessages = null;
        LocalDateTime returnVideoFraudAnalyzedAt = null;

        if (order.getVideos() != null) {
            for (var video : order.getVideos()) {
                if (video.getVideoType() == com.ordermanager.enums.VideoType.PACK && packVideoUrl == null) {
                    packVideoUrl = video.getCloudinaryUrl() != null ? video.getCloudinaryUrl() : video.getFilePath();
                    packVideoFraudDetected = video.getFraudDetected();
                    packVideoFraudAnalyzedAt = video.getFraudAnalyzedAt();
                    packVideoFraudMessages = parseFraudMessages(video.getFraudMessages());
                } else if (video.getVideoType() == com.ordermanager.enums.VideoType.RETURN_CHECK && returnVideoUrl == null) {
                    returnVideoUrl = video.getCloudinaryUrl() != null ? video.getCloudinaryUrl() : video.getFilePath();
                    returnVideoFraudDetected = video.getFraudDetected();
                    returnVideoFraudAnalyzedAt = video.getFraudAnalyzedAt();
                    returnVideoFraudMessages = parseFraudMessages(video.getFraudMessages());
                }
            }
        }

        return OrderResponse.builder()
                .id(order.getId())
                .trackingCode(order.getTrackingCode())
                .shopOrderCode(order.getShopOrderCode())
                .platform(order.getPlatform())
                .status(order.getStatus())
                .customerName(shouldMask() ? DataMaskingUtils.maskName(order.getCustomerName()) : order.getCustomerName())
                .customerPhone(shouldMask() ? DataMaskingUtils.maskPhone(order.getCustomerPhone()) : order.getCustomerPhone())
                .productInfo(order.getProductInfo())
                .shippingCarrier(order.getShippingCarrier())
                .note(order.getNote())
                .packedByName(order.getPackedBy() != null ? order.getPackedBy().getFullName() : null)
                .packedById(order.getPackedBy() != null ? order.getPackedBy().getId() : null)
                .orderDate(order.getOrderDate())
                .packedAt(order.getPackedAt())
                .returnedAt(order.getReturnedAt())
                .deliveredAt(order.getDeliveredAt())
                .importSource(order.getImportSource())
                .createdAt(order.getCreatedAt())
                .hasVideo(order.getVideos() != null && !order.getVideos().isEmpty())
                .packVideoUrl(packVideoUrl)
                .returnVideoUrl(returnVideoUrl)
                .packVideoFraudDetected(packVideoFraudDetected)
                .packVideoFraudMessages(packVideoFraudMessages)
                .packVideoFraudAnalyzedAt(packVideoFraudAnalyzedAt)
                .returnVideoFraudDetected(returnVideoFraudDetected)
                .returnVideoFraudMessages(returnVideoFraudMessages)
                .returnVideoFraudAnalyzedAt(returnVideoFraudAnalyzedAt)
                .returnEvaluation(order.getReturnEvaluation())
                .returnNote(order.getReturnNote())
                .returnRefundStatus(order.getReturnRefundStatus())
                .cancelReason(order.getCancelReason())
                .buyerNote(order.getBuyerNote())
                .province(order.getProvince())
                .predictionRisk(predictionService.predictRisk(order))
                .items(itemResponses)
                .build();
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .productName(item.getProductName())
                .variantName(item.getVariantName())
                .quantity(item.getQuantity())
                .checked(item.getChecked())
                .build();
    }

    private List<String> parseFraudMessages(String fraudMessagesJson) {
        if (fraudMessagesJson == null || fraudMessagesJson.isBlank()) return null;
        try {
            return new ObjectMapper().readValue(fraudMessagesJson, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of(fraudMessagesJson);
        }
    }

    private boolean shouldMask() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return true; // Mask by default if no auth
        return auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}

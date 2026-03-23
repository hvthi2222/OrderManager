package com.ordermanager.entity;

import com.ordermanager.enums.ImportSource;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.enums.ReturnEvaluation;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_tracking_code", columnList = "tracking_code"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_order_date", columnList = "order_date"),
    @Index(name = "idx_order_created_at", columnList = "created_at"),
    @Index(name = "idx_order_packed_at", columnList = "packed_at"),
    @Index(name = "idx_order_updated_at", columnList = "updated_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, unique = true, length = 100)
    private String trackingCode;

    @Column(name = "shop_order_code", length = 100)
    private String shopOrderCode;

    @Column(length = 50)
    private String platform;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "product_info", columnDefinition = "TEXT")
    private String productInfo;

    @Column(name = "shipping_carrier", length = 100)
    private String shippingCarrier;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "packed_by")
    private User packedBy;

    @Column(name = "order_date")
    private LocalDateTime orderDate;

    @Column(name = "packed_at")
    private LocalDateTime packedAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_evaluation", length = 30)
    private ReturnEvaluation returnEvaluation;

    @Column(name = "return_note", columnDefinition = "TEXT")
    private String returnNote;

    @Column(name = "return_refund_status", length = 200)
    private String returnRefundStatus;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "buyer_note", columnDefinition = "TEXT")
    private String buyerNote;

    @Column(length = 100)
    private String province;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_source", length = 20)
    @Builder.Default
    private ImportSource importSource = ImportSource.MANUAL;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Video> videos = new ArrayList<>();
}

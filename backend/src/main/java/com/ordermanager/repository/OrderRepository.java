package com.ordermanager.repository;

import com.ordermanager.entity.Order;
import com.ordermanager.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    Optional<Order> findByTrackingCode(String trackingCode);

    boolean existsByTrackingCode(String trackingCode);

    long countByStatus(OrderStatus status);

    long countByStatusIn(java.util.Collection<OrderStatus> statuses);

    // Report queries
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.createdAt BETWEEN :start AND :end")
    Long countByStatusAndDateRange(
            @Param("status") OrderStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.updatedAt BETWEEN :start AND :end")
    Long countByUpdatedAtAndDateRange(
            @Param("status") OrderStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT o.packedBy.id, o.packedBy.fullName, COUNT(o) FROM Order o " +
           "WHERE o.packedAt BETWEEN :start AND :end AND o.packedBy IS NOT NULL " +
           "GROUP BY o.packedBy.id, o.packedBy.fullName")
    List<Object[]> countByEmployeeAndDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT o.platform, COUNT(o) FROM Order o " +
           "WHERE o.createdAt BETWEEN :start AND :end GROUP BY o.platform")
    List<Object[]> countByPlatformAndDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status " +
           "AND o.packedBy.id = :employeeId " +
           "AND o.updatedAt BETWEEN :start AND :end")
    Long countByStatusAndEmployeeAndUpdatedAt(
            @Param("status") OrderStatus status,
            @Param("employeeId") Long employeeId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status " +
           "AND o.packedBy.id = :employeeId " +
           "AND o.packedAt BETWEEN :start AND :end")
    Long countByStatusAndEmployee(
            @Param("status") OrderStatus status,
            @Param("employeeId") Long employeeId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT o.province, COUNT(o), SUM(CASE WHEN o.status IN :failedStatuses THEN 1 ELSE 0 END) " +
           "FROM Order o WHERE o.status IN :failedStatuses OR o.status IN :successStatuses " +
           "GROUP BY o.province")
    List<Object[]> getRiskStatsByProvince(
            @Param("failedStatuses") java.util.Collection<OrderStatus> failedStatuses,
            @Param("successStatuses") java.util.Collection<OrderStatus> successStatuses
    );

    @Query("SELECT o.shippingCarrier, COUNT(o), SUM(CASE WHEN o.status IN :failedStatuses THEN 1 ELSE 0 END) " +
           "FROM Order o WHERE o.status IN :failedStatuses OR o.status IN :successStatuses " +
           "GROUP BY o.shippingCarrier")
    List<Object[]> getRiskStatsByCarrier(
            @Param("failedStatuses") java.util.Collection<OrderStatus> failedStatuses,
            @Param("successStatuses") java.util.Collection<OrderStatus> successStatuses
    );

    @Query("SELECT o.platform, COUNT(o), SUM(CASE WHEN o.status IN :failedStatuses THEN 1 ELSE 0 END) " +
           "FROM Order o WHERE o.status IN :failedStatuses OR o.status IN :successStatuses " +
           "GROUP BY o.platform")
    List<Object[]> getRiskStatsByPlatform(
            @Param("failedStatuses") java.util.Collection<OrderStatus> failedStatuses,
            @Param("successStatuses") java.util.Collection<OrderStatus> successStatuses
    );

    @Query("SELECT o.packedBy.id, COUNT(o), SUM(CASE WHEN o.status IN :failedStatuses THEN 1 ELSE 0 END) " +
           "FROM Order o WHERE (o.status IN :failedStatuses OR o.status IN :successStatuses) AND o.packedBy IS NOT NULL " +
           "GROUP BY o.packedBy.id")
    List<Object[]> getRiskStatsByEmployee(
            @Param("failedStatuses") java.util.Collection<OrderStatus> failedStatuses,
            @Param("successStatuses") java.util.Collection<OrderStatus> successStatuses
    );
}

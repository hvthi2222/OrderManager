package com.ordermanager.service;

import com.ordermanager.entity.Order;
import com.ordermanager.enums.OrderStatus;
import com.ordermanager.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final OrderRepository orderRepository;

    // Cache cho các tỉ lệ rủi ro (đơn vị: %)
    private final Map<String, Double> provinceRiskMap = new ConcurrentHashMap<>();
    private final Map<String, Double> carrierRiskMap = new ConcurrentHashMap<>();
    private final Map<Long, Double> employeeRiskMap = new ConcurrentHashMap<>();
    private final Map<String, Double> platformRiskMap = new ConcurrentHashMap<>();

    private long lastRefreshTime = 0;
    private static final long REFRESH_INTERVAL = 3600000; // 1 giờ

    // Trọng số cho từng yếu tố
    private static final double PROVINCE_WEIGHT = 1.5;
    private static final double CARRIER_WEIGHT = 1.0;
    private static final double PLATFORM_WEIGHT = 0.8;
    private static final double EMPLOYEE_WEIGHT = 0.7;

    // Ngưỡng & mặc định
    private static final double DEFAULT_RISK = 5.0;
    private static final double MIN_RISK = 1.0;
    private static final double MAX_RISK = 99.0;
    private static final int MIN_EMPLOYEE_ORDERS = 10;

    /**
     * Tính toán rủi ro cho một đơn hàng dựa trên Naive Bayes (Weighted Average)
     */
    public double predictRisk(Order order) {
        refreshStatsIfNeeded();

        double totalScore = 0;
        int factors = 0;

        // 1. Rủi ro theo tỉnh thành (Province)
        if (order.getProvince() != null && !order.getProvince().isEmpty()) {
            Double risk = provinceRiskMap.get(order.getProvince());
            if (risk != null) {
                totalScore += risk * PROVINCE_WEIGHT;
                factors++;
            }
        }

        // 2. Rủi ro theo nhà vận chuyển (Carrier)
        if (order.getShippingCarrier() != null && !order.getShippingCarrier().isEmpty()) {
            Double risk = carrierRiskMap.get(order.getShippingCarrier());
            if (risk != null) {
                totalScore += risk * CARRIER_WEIGHT;
                factors++;
            }
        }

        // 3. Rủi ro theo sàn TMĐT (Platform)
        if (order.getPlatform() != null && !order.getPlatform().isEmpty()) {
            Double risk = platformRiskMap.get(order.getPlatform());
            if (risk != null) {
                totalScore += risk * PLATFORM_WEIGHT;
                factors++;
            }
        }

        // 4. Rủi ro theo nhân viên xử lý (Employee)
        if (order.getPackedBy() != null) {
            Double risk = employeeRiskMap.get(order.getPackedBy().getId());
            if (risk != null) {
                totalScore += risk * EMPLOYEE_WEIGHT;
                factors++;
            }
        }

        if (factors == 0) return DEFAULT_RISK; // Mặc định cho đơn hàng mới chưa có dữ liệu đối chiếu

        // Tính trung bình có trọng số (đơn giản hóa)
        double weightedFactors = (order.getProvince() != null ? PROVINCE_WEIGHT : 0) +
                                (order.getShippingCarrier() != null ? CARRIER_WEIGHT : 0) +
                                (order.getPlatform() != null ? PLATFORM_WEIGHT : 0) +
                                (order.getPackedBy() != null ? EMPLOYEE_WEIGHT : 0);
        
        double finalRisk = totalScore / weightedFactors;

        // Giới hạn trong khoảng MIN_RISK - MAX_RISK
        return Math.max(MIN_RISK, Math.min(MAX_RISK, finalRisk));
    }

    private synchronized void refreshStatsIfNeeded() {
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastRefreshTime > REFRESH_INTERVAL) {
            calculateStats();
            lastRefreshTime = currentTime;
        }
    }

    private void calculateStats() {
        // Lấy danh sách trạng thái coi là "Thất bại" (Hoàn/Hủy)
        List<OrderStatus> failedStatuses = List.of(OrderStatus.CANCELLED, OrderStatus.RETURN_CHECKED, OrderStatus.RETURNED);
        List<OrderStatus> successStatuses = List.of(OrderStatus.COMPLETED);

        // Tính tỉ lệ theo Province
        updateRiskMap(provinceRiskMap, orderRepository.getRiskStatsByProvince(failedStatuses, successStatuses));

        // Tính tỉ lệ theo Carrier
        updateRiskMap(carrierRiskMap, orderRepository.getRiskStatsByCarrier(failedStatuses, successStatuses));

        // Tính tỉ lệ theo Platform
        updateRiskMap(platformRiskMap, orderRepository.getRiskStatsByPlatform(failedStatuses, successStatuses));

        // Tính tỉ lệ theo Employee
        calculateEmployeeRisk(failedStatuses, successStatuses);
    }

    private <K> void updateRiskMap(Map<K, Double> targetMap, List<Object[]> stats) {
        targetMap.clear();
        for (Object[] row : stats) {
            K key = (K) row[0];
            long total = (long) row[1];
            long failed = (long) row[2];
            
            if (total > 0) {
                double risk = (double) failed / total * 100;
                targetMap.put(key, risk);
            }
        }
    }

    private void calculateEmployeeRisk(List<OrderStatus> failedStatuses, List<OrderStatus> successStatuses) {
        employeeRiskMap.clear();
        List<Object[]> stats = orderRepository.getRiskStatsByEmployee(failedStatuses, successStatuses);
        for (Object[] row : stats) {
            Long empId = (Long) row[0];
            long total = (long) row[1];
            long failed = (long) row[2];
            
            if (total > MIN_EMPLOYEE_ORDERS) { // Chỉ tính rủi ro cho nhân viên có đủ mẫu
                double risk = (double) failed / total * 100;
                employeeRiskMap.put(empId, risk);
            }
        }
    }
}

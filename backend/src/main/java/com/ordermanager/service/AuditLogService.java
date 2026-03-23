package com.ordermanager.service;

import com.ordermanager.entity.AuditLog;
import com.ordermanager.entity.User;
import com.ordermanager.repository.AuditLogRepository;
import com.ordermanager.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public void log(String action, String target, Map<String, Object> details, HttpServletRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElse(null);

        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .target(target)
                .details(details)
                .ipAddress(getClientIp(request))
                .build();

        auditLogRepository.save(log);
    }

    public void log(String action, String target) {
        log(action, target, null, null);
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

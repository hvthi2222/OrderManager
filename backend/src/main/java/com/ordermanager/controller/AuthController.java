package com.ordermanager.controller;

import com.ordermanager.dto.LoginRequest;
import com.ordermanager.dto.LoginResponse;
import com.ordermanager.service.AuditLogService;
import com.ordermanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request);
        auditLogService.log("LOGIN", request.getUsername(), null, httpRequest);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> getCurrentUser() {
        // This will be handled by Spring Security context
        return ResponseEntity.ok().build();
    }
}

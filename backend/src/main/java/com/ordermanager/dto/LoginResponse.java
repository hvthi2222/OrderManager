package com.ordermanager.dto;

import com.ordermanager.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String token;
    private Long userId;
    private String username;
    private String fullName;
    private Role role;
}

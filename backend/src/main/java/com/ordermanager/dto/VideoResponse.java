package com.ordermanager.dto;

import com.ordermanager.enums.VideoType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoResponse {
    private Long id;
    private String trackingCode;
    private String cloudinaryUrl;
    private String cloudinaryPublicId;
    private VideoType videoType;
    private String recordedByName;
    private LocalDateTime recordedAt;
    private LocalDateTime expiresAt;
    private Long fileSize;
    private String filePath;
    private Boolean fraudDetected;
    private List<String> fraudMessages;
    private LocalDateTime fraudAnalyzedAt;
}

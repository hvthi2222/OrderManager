package com.ordermanager.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Client to trigger video fraud analysis. Fire-and-forget - does not await result.
 * Result arrives via callback to /api/videos/{id}/analysis-callback.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FraudDetectorClient {

    private final RestTemplate restTemplate;

    @Value("${app.fraud-detector.url:http://localhost:8001}")
    private String baseUrl;

    @Value("${app.fraud-detector.callback-base-url:http://localhost:8080}")
    private String callbackBaseUrl;

    @Value("${app.fraud-detector.enabled:true}")
    private boolean enabled;

    /**
     * Trigger fraud analysis. Call this in background (e.g. CompletableFuture.runAsync).
     * Does not block. Result will be sent to callback URL.
     */
    public void triggerAnalysis(Long videoId, String videoUrl) {
        if (!enabled) {
            log.debug("Fraud detector disabled, skipping analysis for video {}", videoId);
            return;
        }
        if (videoUrl == null || videoUrl.isBlank()) {
            log.warn("Cannot trigger analysis: video URL is empty for video {}", videoId);
            return;
        }

        String callbackUrl = callbackBaseUrl + "/api/videos/" + videoId + "/analysis-callback";
        Map<String, Object> body = Map.of(
                "video_url", videoUrl,
                "video_id", videoId.intValue(),
                "callback_url", callbackUrl
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<?> request = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(baseUrl + "/api/analyze", request, String.class);
            log.info("Triggered fraud analysis for video {}", videoId);
        } catch (Exception e) {
            log.warn("Failed to trigger fraud analysis for video {}: {}", videoId, e.getMessage());
        }
    }
}

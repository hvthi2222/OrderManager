package com.ordermanager.controller;

import com.ordermanager.dto.VideoResponse;
import com.ordermanager.entity.Video;
import com.ordermanager.enums.VideoType;
import com.ordermanager.service.VideoService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;

    /**
     * Save video record after frontend uploaded to Cloudinary.
     */
    @PostMapping("/save")
    public ResponseEntity<?> saveVideo(@RequestBody Map<String, Object> body) {
        try {
            String trackingCode = (String) body.get("trackingCode");
            String videoType = (String) body.get("videoType");
            String cloudinaryUrl = (String) body.get("cloudinaryUrl");
            String cloudinaryPublicId = (String) body.get("cloudinaryPublicId");
            Long fileSize = body.get("fileSize") != null
                    ? ((Number) body.get("fileSize")).longValue()
                    : null;

            VideoType type = VideoType.valueOf(videoType.toUpperCase());
            VideoResponse video = videoService.saveCloudinaryVideo(
                    trackingCode, type, cloudinaryUrl, cloudinaryPublicId, fileSize);

            return ResponseEntity.ok(video);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get videos for a specific order by tracking code.
     */
    @GetMapping("/order/{trackingCode}")
    public ResponseEntity<List<VideoResponse>> getVideosByOrder(@PathVariable String trackingCode) {
        return ResponseEntity.ok(videoService.getVideosByTrackingCode(trackingCode));
    }

    /**
     * List all videos with filters (admin).
     */
    @GetMapping
    public ResponseEntity<Page<VideoResponse>> listVideos(
            @RequestParam(required = false) String trackingCode,
            @RequestParam(required = false) String videoType,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        VideoType type = videoType != null ? VideoType.valueOf(videoType.toUpperCase()) : null;
        LocalDateTime start = startDate != null ? LocalDate.parse(startDate).atStartOfDay() : null;
        LocalDateTime end = endDate != null ? LocalDate.parse(endDate).atTime(LocalTime.MAX) : null;
        PageRequest pageable = PageRequest.of(page, size, Sort.by("recordedAt").descending());

        return ResponseEntity.ok(videoService.getVideos(trackingCode, type, employeeId, start, end, pageable));
    }

    /**
     * Callback from Fraud Detector when analysis completes. No auth required.
     */
    @PostMapping("/{id}/analysis-callback")
    public ResponseEntity<?> analysisCallback(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        videoService.saveFraudAnalysisResult(id, body);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

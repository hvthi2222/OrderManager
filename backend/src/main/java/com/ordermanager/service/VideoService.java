package com.ordermanager.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordermanager.client.FraudDetectorClient;
import com.ordermanager.dto.VideoResponse;
import com.ordermanager.entity.Order;
import com.ordermanager.entity.User;
import com.ordermanager.entity.Video;
import com.ordermanager.enums.VideoType;
import com.ordermanager.exception.ResourceNotFoundException;
import com.ordermanager.repository.OrderRepository;
import com.ordermanager.repository.UserRepository;
import com.ordermanager.repository.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoService {

    private final VideoRepository videoRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final FraudDetectorClient fraudDetectorClient;

    @Value("${app.video.retention-days:15}")
    private int retentionDays;

    /**
     * Save a video record after frontend uploaded to Cloudinary.
     */
    public VideoResponse saveCloudinaryVideo(String trackingCode, VideoType videoType,
                                              String cloudinaryUrl, String cloudinaryPublicId,
                                              Long fileSize) {
        Order order = orderRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + trackingCode));

        User user = getCurrentUser();

        Video video = Video.builder()
                .order(order)
                .cloudinaryUrl(cloudinaryUrl)
                .cloudinaryPublicId(cloudinaryPublicId)
                .fileName(cloudinaryPublicId)
                .filePath(cloudinaryUrl)
                .videoType(videoType)
                .recordedBy(user)
                .fileSize(fileSize)
                .expiresAt(LocalDateTime.now().plusDays(retentionDays))
                .build();

        video = videoRepository.save(video);

        Long savedVideoId = video.getId();
        String videoUrl = cloudinaryUrl;
        CompletableFuture.runAsync(() -> fraudDetectorClient.triggerAnalysis(savedVideoId, videoUrl));

        return toResponse(video);
    }

    /**
     * Get videos for an order.
     */
    public List<VideoResponse> getVideosByOrder(Long orderId) {
        return videoRepository.findByOrderIdOrderByRecordedAtDesc(orderId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Get videos by tracking code.
     */
    public List<VideoResponse> getVideosByTrackingCode(String trackingCode) {
        Order order = orderRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + trackingCode));
        return videoRepository.findByOrderIdOrderByRecordedAtDesc(order.getId()).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Get all videos with filters using Specification.
     */
    public Page<VideoResponse> getVideos(String trackingCode, VideoType videoType, Long employeeId,
                                          LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<Video> spec = Specification.where(null);

        if (trackingCode != null && !trackingCode.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(root.get("order").get("trackingCode"), "%" + trackingCode + "%"));
        }
        if (videoType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("videoType"), videoType));
        }
        if (employeeId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("recordedBy").get("id"), employeeId));
        }
        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("recordedAt"), startDate));
        }
        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("recordedAt"), endDate));
        }

        return videoRepository.findAll(spec, pageable).map(this::toResponse);
    }

    /**
     * Save fraud analysis result from Fraud Detector callback.
     */
    public void saveFraudAnalysisResult(Long videoId, Map<String, Object> body) {
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null) return;

        Boolean obscured = body.get("obscured") != null ? (Boolean) body.get("obscured") : false;
        Boolean excessiveShake = body.get("excessive_shake") != null ? (Boolean) body.get("excessive_shake") : false;
        Boolean abnormalCut = body.get("abnormal_cut") != null ? (Boolean) body.get("abnormal_cut") : false;

        video.setFraudDetected(obscured || excessiveShake || abnormalCut);
        if (body.get("messages") instanceof List<?> messages) {
            try {
                video.setFraudMessages(new ObjectMapper().writeValueAsString(messages));
            } catch (JsonProcessingException e) {
                video.setFraudMessages(String.join("; ", messages.stream().map(Object::toString).toList()));
            }
        }
        video.setFraudAnalyzedAt(LocalDateTime.now());
        videoRepository.save(video);
    }

    public VideoResponse toResponse(Video video) {
        List<String> fraudMessagesList = null;
        if (video.getFraudMessages() != null && !video.getFraudMessages().isBlank()) {
            try {
                fraudMessagesList = new ObjectMapper().readValue(
                        video.getFraudMessages(),
                        new TypeReference<List<String>>() {});
            } catch (JsonProcessingException e) {
                fraudMessagesList = List.of(video.getFraudMessages());
            }
        }
        return VideoResponse.builder()
                .id(video.getId())
                .trackingCode(video.getOrder() != null ? video.getOrder().getTrackingCode() : null)
                .cloudinaryUrl(video.getCloudinaryUrl())
                .cloudinaryPublicId(video.getCloudinaryPublicId())
                .videoType(video.getVideoType())
                .recordedByName(video.getRecordedBy() != null ? video.getRecordedBy().getFullName() : null)
                .recordedAt(video.getRecordedAt())
                .expiresAt(video.getExpiresAt())
                .fileSize(video.getFileSize())
                .filePath(video.getFilePath())
                .fraudDetected(video.getFraudDetected())
                .fraudMessages(fraudMessagesList)
                .fraudAnalyzedAt(video.getFraudAnalyzedAt())
                .build();
    }

    /**
     * Delete expired video records (runs daily at 2 AM).
     * Note: Cloudinary videos should be cleaned up via Cloudinary API or auto-delete settings.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupExpiredVideos() {
        List<Video> expired = videoRepository.findByExpiresAtBefore(LocalDateTime.now());
        for (Video video : expired) {
            videoRepository.delete(video);
        }
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }
}

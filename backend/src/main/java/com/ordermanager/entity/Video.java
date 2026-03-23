package com.ordermanager.entity;

import com.ordermanager.enums.VideoType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "videos", indexes = {
    @Index(name = "idx_video_expires", columnList = "expires_at")
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "cloudinary_url")
    private String cloudinaryUrl;

    @Column(name = "cloudinary_public_id")
    private String cloudinaryPublicId;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_type", nullable = false, length = 20)
    private VideoType videoType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "fraud_detected")
    private Boolean fraudDetected;

    @Column(name = "fraud_messages")
    private String fraudMessages;

    @Column(name = "fraud_analyzed_at")
    private LocalDateTime fraudAnalyzedAt;

    @PrePersist
    public void calculateExpiry() {
        if (this.expiresAt == null && this.recordedAt != null) {
            this.expiresAt = this.recordedAt.plusDays(15);
        } else if (this.expiresAt == null) {
            this.expiresAt = LocalDateTime.now().plusDays(15);
        }
    }
}

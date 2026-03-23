package com.ordermanager.repository;

import com.ordermanager.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Long>, JpaSpecificationExecutor<Video> {

    List<Video> findByExpiresAtBefore(LocalDateTime dateTime);

    List<Video> findByOrderIdOrderByRecordedAtDesc(Long orderId);
}

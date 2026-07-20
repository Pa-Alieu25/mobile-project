package com.knust.classmate.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementReadRepository extends JpaRepository<AnnouncementRead, Long> {
    List<AnnouncementRead> findByUserId(Long userId);
    boolean existsByAnnouncementIdAndUserId(Long announcementId, Long userId);
    void deleteByAnnouncementId(Long announcementId);
}

package com.knust.classmate.announcement;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Records that a specific student has read a specific announcement. One row
 * per (announcement, user) pair so read status is per-student and survives
 * sign-out/sign-in and device switches.
 */
@Entity
@Table(name = "announcement_reads", uniqueConstraints = @UniqueConstraint(columnNames = { "announcement_id", "user_id" }))
public class AnnouncementRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long announcementId;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime readAt;

    public AnnouncementRead() {}

    public AnnouncementRead(Long announcementId, Long userId) {
        this.announcementId = announcementId;
        this.userId = userId;
    }

    public Long getId() { return id; }
    public Long getAnnouncementId() { return announcementId; }
    public void setAnnouncementId(Long announcementId) { this.announcementId = announcementId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDateTime getReadAt() { return readAt; }
}

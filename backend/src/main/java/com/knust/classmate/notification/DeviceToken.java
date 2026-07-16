package com.knust.classmate.notification;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_tokens")
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The user this device belongs to, so we can target notifications per student.
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true)
    private String expoPushToken;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public DeviceToken() {}

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getExpoPushToken() { return expoPushToken; }
    public void setExpoPushToken(String expoPushToken) { this.expoPushToken = expoPushToken; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

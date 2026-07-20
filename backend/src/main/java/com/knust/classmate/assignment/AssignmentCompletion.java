package com.knust.classmate.assignment;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Records that a specific student has marked a specific assignment done. One
 * row per (assignment, user) pair so completion is per-student and survives
 * sign-out/sign-in and device switches.
 */
@Entity
@Table(name = "assignment_completions", uniqueConstraints = @UniqueConstraint(columnNames = { "assignmentId", "userId" }))
public class AssignmentCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long assignmentId;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime completedAt;

    public AssignmentCompletion() {}

    public AssignmentCompletion(Long assignmentId, Long userId) {
        this.assignmentId = assignmentId;
        this.userId = userId;
    }

    public Long getId() { return id; }
    public Long getAssignmentId() { return assignmentId; }
    public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}

package com.knust.classmate.assignment;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "assignments")
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String courseCode;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String dueDate;

    @Column(nullable = false)
    private String classGroup;

    @Column(nullable = false)
    private String postedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime postedAt;

    public Assignment() {}

    public Long getId() { return id; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    public String getClassGroup() { return classGroup; }
    public void setClassGroup(String classGroup) { this.classGroup = classGroup; }
    public String getPostedBy() { return postedBy; }
    public void setPostedBy(String postedBy) { this.postedBy = postedBy; }
    public LocalDateTime getPostedAt() { return postedAt; }

    public String getPostedAtFormatted() {
        if (postedAt == null) return "";
        return postedAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a"));
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String courseCode, title, description, dueDate, classGroup, postedBy;

        public Builder courseCode(String v) { this.courseCode = v; return this; }
        public Builder title(String v) { this.title = v; return this; }
        public Builder description(String v) { this.description = v; return this; }
        public Builder dueDate(String v) { this.dueDate = v; return this; }
        public Builder classGroup(String v) { this.classGroup = v; return this; }
        public Builder postedBy(String v) { this.postedBy = v; return this; }

        public Assignment build() {
            Assignment a = new Assignment();
            a.courseCode = this.courseCode;
            a.title = this.title;
            a.description = this.description;
            a.dueDate = this.dueDate;
            a.classGroup = this.classGroup;
            a.postedBy = this.postedBy;
            return a;
        }
    }
}

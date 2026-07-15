package com.knust.classmate.score;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Entity
@Table(name = "midsem_scores")
public class MidsemScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String courseCode;

    @Column(nullable = false)
    private String courseTitle;

    // The student's index number — how a score is matched to a specific student.
    @Column(nullable = false)
    private String indexNumber;

    @Column(nullable = false)
    private String score;

    @Column(nullable = false)
    private String grade;

    @Column(nullable = false)
    private String uploadedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;

    public MidsemScore() {}

    public Long getId() { return id; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public String getIndexNumber() { return indexNumber; }
    public void setIndexNumber(String indexNumber) { this.indexNumber = indexNumber; }
    public String getScore() { return score; }
    public void setScore(String score) { this.score = score; }
    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }
    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }

    public String getUploadedAtFormatted() {
        if (uploadedAt == null) return "";
        return uploadedAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a"));
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String courseCode, courseTitle, indexNumber, score, grade, uploadedBy;

        public Builder courseCode(String v) { this.courseCode = v; return this; }
        public Builder courseTitle(String v) { this.courseTitle = v; return this; }
        public Builder indexNumber(String v) { this.indexNumber = v; return this; }
        public Builder score(String v) { this.score = v; return this; }
        public Builder grade(String v) { this.grade = v; return this; }
        public Builder uploadedBy(String v) { this.uploadedBy = v; return this; }

        public MidsemScore build() {
            MidsemScore s = new MidsemScore();
            s.courseCode = this.courseCode;
            s.courseTitle = this.courseTitle;
            s.indexNumber = this.indexNumber;
            s.score = this.score;
            s.grade = this.grade;
            s.uploadedBy = this.uploadedBy;
            return s;
        }
    }
}

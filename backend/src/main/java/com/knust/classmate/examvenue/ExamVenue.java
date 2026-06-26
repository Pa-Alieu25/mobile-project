package com.knust.classmate.examvenue;

import jakarta.persistence.*;

@Entity
@Table(name = "exam_venues")
public class ExamVenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String courseCode;

    @Column(nullable = false)
    private String courseTitle;

    @Column(nullable = false)
    private String examDate;

    @Column(nullable = false)
    private String examTime;

    @Column(nullable = false)
    private String venue;

    @Column(nullable = false)
    private String buildingOrBlock;

    @Column
    private String roomOrHall;

    @Column(nullable = false)
    private Long startIndex;

    @Column(nullable = false)
    private Long endIndex;

    @Column(nullable = false)
    private String status = "pending";

    public ExamVenue() {}

    public Long getId() { return id; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public String getExamDate() { return examDate; }
    public void setExamDate(String examDate) { this.examDate = examDate; }
    public String getExamTime() { return examTime; }
    public void setExamTime(String examTime) { this.examTime = examTime; }
    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }
    public String getBuildingOrBlock() { return buildingOrBlock; }
    public void setBuildingOrBlock(String buildingOrBlock) { this.buildingOrBlock = buildingOrBlock; }
    public String getRoomOrHall() { return roomOrHall; }
    public void setRoomOrHall(String roomOrHall) { this.roomOrHall = roomOrHall; }
    public Long getStartIndex() { return startIndex; }
    public void setStartIndex(Long startIndex) { this.startIndex = startIndex; }
    public Long getEndIndex() { return endIndex; }
    public void setEndIndex(Long endIndex) { this.endIndex = endIndex; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String courseCode, courseTitle, examDate, examTime, venue;
        private String buildingOrBlock, roomOrHall, status = "pending";
        private Long startIndex, endIndex;

        public Builder courseCode(String v) { this.courseCode = v; return this; }
        public Builder courseTitle(String v) { this.courseTitle = v; return this; }
        public Builder examDate(String v) { this.examDate = v; return this; }
        public Builder examTime(String v) { this.examTime = v; return this; }
        public Builder venue(String v) { this.venue = v; return this; }
        public Builder buildingOrBlock(String v) { this.buildingOrBlock = v; return this; }
        public Builder roomOrHall(String v) { this.roomOrHall = v; return this; }
        public Builder startIndex(Long v) { this.startIndex = v; return this; }
        public Builder endIndex(Long v) { this.endIndex = v; return this; }
        public Builder status(String v) { this.status = v; return this; }

        public ExamVenue build() {
            ExamVenue e = new ExamVenue();
            e.courseCode = this.courseCode;
            e.courseTitle = this.courseTitle;
            e.examDate = this.examDate;
            e.examTime = this.examTime;
            e.venue = this.venue;
            e.buildingOrBlock = this.buildingOrBlock;
            e.roomOrHall = this.roomOrHall;
            e.startIndex = this.startIndex;
            e.endIndex = this.endIndex;
            e.status = this.status;
            return e;
        }
    }
}

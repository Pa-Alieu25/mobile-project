package com.knust.classmate.timetable;

import jakarta.persistence.*;

@Entity
@Table(name = "timetable_records")
public class TimetableRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String courseCode;

    @Column(nullable = false)
    private String courseTitle;

    @Column(nullable = false)
    private String dayOfWeek;

    @Column(nullable = false)
    private String startTime;

    @Column(nullable = false)
    private String endTime;

    @Column(nullable = false)
    private String venue;

    @Column(nullable = false)
    private String lecturer;

    @Column(nullable = false)
    private String classGroup;

    @Column(nullable = false)
    private String status = "active";

    // Left over from an earlier schema version of this table; still NOT NULL
    // at the DB level, so every insert must populate it.
    @Column(nullable = false)
    private Long createdByUserId;

    public TimetableRecord() {}

    public Long getId() { return id; }
    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }
    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }
    public String getLecturer() { return lecturer; }
    public void setLecturer(String lecturer) { this.lecturer = lecturer; }
    public String getClassGroup() { return classGroup; }
    public void setClassGroup(String classGroup) { this.classGroup = classGroup; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String courseCode, courseTitle, dayOfWeek, startTime, endTime;
        private String venue, lecturer, classGroup, status = "active";
        private Long createdByUserId;

        public Builder courseCode(String v) { this.courseCode = v; return this; }
        public Builder courseTitle(String v) { this.courseTitle = v; return this; }
        public Builder dayOfWeek(String v) { this.dayOfWeek = v; return this; }
        public Builder startTime(String v) { this.startTime = v; return this; }
        public Builder endTime(String v) { this.endTime = v; return this; }
        public Builder venue(String v) { this.venue = v; return this; }
        public Builder lecturer(String v) { this.lecturer = v; return this; }
        public Builder classGroup(String v) { this.classGroup = v; return this; }
        public Builder status(String v) { this.status = v; return this; }
        public Builder createdByUserId(Long v) { this.createdByUserId = v; return this; }

        public TimetableRecord build() {
            TimetableRecord r = new TimetableRecord();
            r.courseCode = this.courseCode;
            r.courseTitle = this.courseTitle;
            r.dayOfWeek = this.dayOfWeek;
            r.startTime = this.startTime;
            r.endTime = this.endTime;
            r.venue = this.venue;
            r.lecturer = this.lecturer;
            r.classGroup = this.classGroup;
            r.status = this.status;
            r.createdByUserId = this.createdByUserId;
            return r;
        }
    }
}

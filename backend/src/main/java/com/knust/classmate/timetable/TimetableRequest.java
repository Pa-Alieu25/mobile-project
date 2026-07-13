package com.knust.classmate.timetable;

import jakarta.validation.constraints.NotBlank;

public record TimetableRequest(
    @NotBlank String courseCode,
    @NotBlank String courseTitle,
    @NotBlank String dayOfWeek,
    @NotBlank String startTime,
    @NotBlank String endTime,
    @NotBlank String venue,
    @NotBlank String lecturer,
    @NotBlank String classGroup,
    String status
) {}

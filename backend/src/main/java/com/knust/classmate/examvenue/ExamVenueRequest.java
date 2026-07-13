package com.knust.classmate.examvenue;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ExamVenueRequest(
    @NotBlank String courseCode,
    @NotBlank String courseTitle,
    @NotBlank String examDate,
    @NotBlank String examTime,
    @NotBlank String venue,
    @NotBlank String buildingOrBlock,
    String roomOrHall,
    @NotNull Long startIndex,
    @NotNull Long endIndex,
    String status
) {}

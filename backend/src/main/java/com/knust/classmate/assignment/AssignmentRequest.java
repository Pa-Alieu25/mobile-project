package com.knust.classmate.assignment;

import jakarta.validation.constraints.NotBlank;

public record AssignmentRequest(
    @NotBlank String courseCode,
    @NotBlank String title,
    @NotBlank String description,
    @NotBlank String dueDate,
    String classGroup
) {}

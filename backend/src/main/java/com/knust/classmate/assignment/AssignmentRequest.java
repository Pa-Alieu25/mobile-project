package com.knust.classmate.assignment;

import jakarta.validation.constraints.NotBlank;

public record AssignmentRequest(
    @NotBlank String courseCode,
    @NotBlank String title,
    // Optional: instructions/description, an attached document, or both are
    // valid — the client is responsible for requiring at least one before
    // submitting, since the document (if any) is attached in a separate call.
    String description,
    @NotBlank String dueDate,
    String classGroup
) {}

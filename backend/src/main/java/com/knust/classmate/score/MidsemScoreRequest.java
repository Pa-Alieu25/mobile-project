package com.knust.classmate.score;

import jakarta.validation.constraints.NotBlank;

public record MidsemScoreRequest(
    @NotBlank String courseCode,
    @NotBlank String courseTitle,
    @NotBlank String indexNumber,
    @NotBlank String score,
    @NotBlank String grade
) {}

package com.knust.classmate.score;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * A bulk midsem-score upload: one course, many student rows. Each row identifies
 * a student by index OR reference number (resolved server-side), plus a score and
 * optional grade.
 */
public record BulkScoreRequest(
    @NotBlank String courseCode,
    @NotBlank String courseTitle,
    @NotEmpty List<Row> rows
) {
    public record Row(String identifier, String score, String grade) {}
}

package com.knust.classmate.timetable;

import jakarta.validation.constraints.NotBlank;

public record StatusUpdateRequest(
    @NotBlank String status
) {}

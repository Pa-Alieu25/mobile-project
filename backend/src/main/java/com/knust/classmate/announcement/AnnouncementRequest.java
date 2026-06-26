package com.knust.classmate.announcement;

import jakarta.validation.constraints.NotBlank;

public record AnnouncementRequest(
    @NotBlank String title,
    @NotBlank String message,
    @NotBlank String category,
    String targetClassGroup
) {}

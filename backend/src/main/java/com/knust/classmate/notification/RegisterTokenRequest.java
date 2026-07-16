package com.knust.classmate.notification;

import jakarta.validation.constraints.NotBlank;

public record RegisterTokenRequest(
    @NotBlank String token
) {}

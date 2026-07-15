package com.knust.classmate.admin;

import jakarta.validation.constraints.NotBlank;

public record MakeRepRequest(
    @NotBlank String identifier
) {}

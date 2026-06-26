package com.knust.classmate.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank String fullName,
    @NotBlank String indexNumber,
    @NotBlank String referenceNumber,
    @NotBlank @Email String email,
    @NotBlank String programme,
    @NotBlank String level,
    String classGroup,
    @NotBlank @Size(min = 6) String password
) {}

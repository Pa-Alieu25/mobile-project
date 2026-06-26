package com.knust.classmate.auth;

public record LoginResponse(
    String token,
    UserResponse user
) {}

package com.knust.classmate.auth;

import com.knust.classmate.user.User;

public record UserResponse(
    Long id,
    String fullName,
    String indexNumber,
    String referenceNumber,
    String email,
    String role,
    String programme,
    String level,
    String classGroup
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getIndexNumber(),
            user.getReferenceNumber(),
            user.getEmail(),
            user.getRole().name().toLowerCase(),
            user.getProgramme(),
            user.getLevel(),
            user.getClassGroup()
        );
    }
}

package com.knust.classmate.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// No id, email, studentIndexNumber, role, or password fields: those are either
// resolved from the authenticated principal (never trusted from the request
// body) or immutable via this endpoint. Accepting them here would be a
// privilege-escalation / identity-spoofing vector, the same reasoning as
// RegisterRequest omitting role.
public record UpdateProfileRequest(
    @NotBlank(message = "Full name is required.")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters.")
    String fullName,

    // Ghana mobile format: 0XXXXXXXXX or +233XXXXXXXXX, second digit 2/3/5
    // (covers MTN, Vodafone, AirtelTigo, Glo). Blank is allowed since phone is optional.
    @Pattern(
        regexp = "^$|^(0[235]\\d{8}|\\+233[235]\\d{8})$",
        message = "Enter a valid Ghana phone number, e.g. 0244123456 or +233244123456."
    )
    String phone,

    @Size(max = 500, message = "Bio must be 500 characters or fewer.")
    String bio,

    String programme,
    String level
) {}

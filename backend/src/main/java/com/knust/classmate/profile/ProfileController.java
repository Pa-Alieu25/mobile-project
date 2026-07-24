package com.knust.classmate.profile;

import com.knust.classmate.user.User;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    private final ProfileService profileService;

    @Autowired
    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> me(Authentication authentication) {
        User user = profileService.currentUser(authentication.getName());
        return ResponseEntity.ok(ProfileResponse.from(user));
    }

    // Only editable fields are accepted (see UpdateProfileRequest) and the user
    // is always resolved from the JWT subject, never from the request body.
    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMe(@Valid @RequestBody UpdateProfileRequest request,
                                                    Authentication authentication) {
        User updated = profileService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ProfileResponse.from(updated));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                               Authentication authentication) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}

package com.knust.classmate.notification;

import com.knust.classmate.exception.ApiException;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    @Autowired
    public NotificationController(DeviceTokenRepository deviceTokenRepository, UserRepository userRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.userRepository = userRepository;
    }

    // The app registers its Expo push token here after login so the backend can
    // target this user's device. Re-registering the same token just updates it.
    @PostMapping("/register-token")
    public ResponseEntity<Void> registerToken(@Valid @RequestBody RegisterTokenRequest request,
                                              Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        DeviceToken deviceToken = deviceTokenRepository.findByExpoPushToken(request.token())
            .orElseGet(DeviceToken::new);
        deviceToken.setExpoPushToken(request.token());
        deviceToken.setUserId(user.getId());
        deviceTokenRepository.save(deviceToken);

        return ResponseEntity.ok().build();
    }
}

package com.knust.classmate.admin;

import com.knust.classmate.auth.UserResponse;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;

    @Autowired
    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/pending-reps")
    public ResponseEntity<List<UserResponse>> getPendingReps() {
        List<UserResponse> pending = userRepository.findAll()
            .stream()
            .filter(u -> "PENDING".equals(u.getStatus()))
            .map(UserResponse::from)
            .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/approve-rep/{userId}")
    public ResponseEntity<UserResponse> approveRep(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("ACTIVE");
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }

    @PostMapping("/reject-rep/{userId}")
    public ResponseEntity<UserResponse> rejectRep(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("REJECTED");
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }
}

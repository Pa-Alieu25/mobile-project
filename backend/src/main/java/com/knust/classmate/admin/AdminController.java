package com.knust.classmate.admin;

import com.knust.classmate.auth.UserResponse;
import com.knust.classmate.exception.ApiException;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import com.knust.classmate.user.UserRole;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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

    // Current course reps, so the admin can see and manage them.
    @GetMapping("/reps")
    public ResponseEntity<List<UserResponse>> getReps() {
        List<UserResponse> reps = userRepository.findByRole(UserRole.COURSE_REP)
            .stream()
            .map(UserResponse::from)
            .toList();
        return ResponseEntity.ok(reps);
    }

    // Promote a registered student to course rep by their index number or email.
    // The person must already have a student account.
    @PostMapping("/make-rep")
    public ResponseEntity<UserResponse> makeRep(@Valid @RequestBody MakeRepRequest request) {
        User user = userRepository.findByIdentifier(request.identifier().trim())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "No account found for that index number or email. The person must register first."));

        if (user.getRole() == UserRole.ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That account is an admin.");
        }

        user.setRole(UserRole.COURSE_REP);
        user.setStatus("ACTIVE");
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }

    // Demote a course rep back to a normal student.
    @PostMapping("/remove-rep/{userId}")
    public ResponseEntity<UserResponse> removeRep(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
        user.setRole(UserRole.STUDENT);
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }
}

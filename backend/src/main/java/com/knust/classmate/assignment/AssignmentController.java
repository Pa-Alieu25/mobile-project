package com.knust.classmate.assignment;

import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/assignments")
public class AssignmentController {

    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    @Autowired
    public AssignmentController(AssignmentRepository assignmentRepository,
                                 UserRepository userRepository) {
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Assignment>> getAll() {
        return ResponseEntity.ok(assignmentRepository.findAllByOrderByPostedAtDesc());
    }

    @PostMapping
    public ResponseEntity<Assignment> create(
            @Valid @RequestBody AssignmentRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        Assignment assignment = Assignment.builder()
            .courseCode(request.courseCode())
            .title(request.title())
            .description(request.description())
            .dueDate(request.dueDate())
            .classGroup(request.classGroup() != null ? request.classGroup() : "ALL")
            .postedBy(user.getFullName())
            .build();

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(assignmentRepository.save(assignment));
    }
}

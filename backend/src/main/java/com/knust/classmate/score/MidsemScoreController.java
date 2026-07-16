package com.knust.classmate.score;

import com.knust.classmate.exception.ApiException;
import com.knust.classmate.notification.PushService;
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
@RequestMapping("/scores")
public class MidsemScoreController {

    private final MidsemScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final PushService pushService;

    @Autowired
    public MidsemScoreController(MidsemScoreRepository scoreRepository, UserRepository userRepository,
                                 PushService pushService) {
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.pushService = pushService;
    }

    // A student sees only their own scores, matched by their index number.
    @GetMapping("/me")
    public ResponseEntity<List<MidsemScore>> myScores(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        if (user.getIndexNumber() == null || user.getIndexNumber().isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(scoreRepository.findByIndexNumber(user.getIndexNumber()));
    }

    @PostMapping
    public ResponseEntity<MidsemScore> create(@Valid @RequestBody MidsemScoreRequest request,
                                              Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        MidsemScore score = MidsemScore.builder()
            .courseCode(request.courseCode())
            .courseTitle(request.courseTitle())
            .indexNumber(request.indexNumber().toUpperCase())
            .score(request.score())
            .grade(request.grade())
            .uploadedBy(user.getFullName())
            .build();

        MidsemScore saved = scoreRepository.save(score);

        // Notify the specific student whose index number this score belongs to.
        userRepository.findByIdentifier(request.indexNumber().trim()).ifPresent(student ->
            pushService.notifyUser(student.getId(), "Midsem score available",
                "Your " + request.courseCode() + " midsem score has been posted."));

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}

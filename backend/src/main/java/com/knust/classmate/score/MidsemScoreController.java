package com.knust.classmate.score;

import com.knust.classmate.audit.AuditService;
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

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@RestController
@RequestMapping("/scores")
public class MidsemScoreController {

    private final MidsemScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final PushService pushService;
    private final AuditService auditService;

    @Autowired
    public MidsemScoreController(MidsemScoreRepository scoreRepository, UserRepository userRepository,
                                 PushService pushService, AuditService auditService) {
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.pushService = pushService;
        this.auditService = auditService;
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
                "Your " + request.courseCode() + " midsem score has been posted.", "/my-scores"));

        auditService.log("SCORE_UPLOADED",
            request.courseCode() + " for index " + request.indexNumber().toUpperCase());

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Bulk upload from a parsed score file. Each row's identifier (index OR
    // reference number) is resolved to a student, and the score is stored against
    // that student's canonical index number. Unmatched identifiers are reported,
    // never guessed. Only matched students are notified, once each.
    @PostMapping("/bulk")
    public ResponseEntity<BulkScoreResponse> bulk(@Valid @RequestBody BulkScoreRequest request,
                                                  Authentication authentication) {
        User uploader = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));

        int added = 0;
        List<String> unmatched = new ArrayList<>();
        LinkedHashSet<Long> notifyUserIds = new LinkedHashSet<>();

        for (BulkScoreRequest.Row row : request.rows()) {
            String identifier = row.identifier() == null ? "" : row.identifier().trim();
            String score = row.score() == null ? "" : row.score().trim();
            if (identifier.isBlank() || score.isBlank()) {
                unmatched.add((identifier.isBlank() ? "(blank)" : identifier) + " — missing identifier or score");
                continue;
            }

            User student = userRepository.findByIdentifier(identifier).orElse(null);
            if (student == null || student.getIndexNumber() == null || student.getIndexNumber().isBlank()) {
                unmatched.add(identifier);
                continue;
            }

            MidsemScore entry = MidsemScore.builder()
                .courseCode(request.courseCode())
                .courseTitle(request.courseTitle())
                .indexNumber(student.getIndexNumber().toUpperCase())
                .score(score)
                .grade(row.grade() == null || row.grade().isBlank() ? "-" : row.grade().trim())
                .uploadedBy(uploader.getFullName())
                .build();
            scoreRepository.save(entry);
            notifyUserIds.add(student.getId());
            added++;
        }

        // Notify each matched student once (deduped by user id).
        for (Long studentId : notifyUserIds) {
            pushService.notifyUser(studentId, "Midsem score available",
                "Your " + request.courseCode() + " midsem score has been posted.", "/my-scores");
        }

        auditService.log("SCORE_BULK_UPLOADED",
            request.courseCode() + ": " + added + " of " + request.rows().size() + " rows saved");

        return ResponseEntity.ok(new BulkScoreResponse(request.rows().size(), added, unmatched));
    }
}

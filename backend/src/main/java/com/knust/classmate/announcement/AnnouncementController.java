package com.knust.classmate.announcement;

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
@RequestMapping("/announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;

    @Autowired
    public AnnouncementController(AnnouncementRepository announcementRepository,
                                   UserRepository userRepository) {
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>> getAll(
            @RequestParam(required = false) String category) {
        List<Announcement> announcements;
        if (category != null && !category.isBlank()) {
            announcements = announcementRepository.findByCategoryOrderByPostedAtDesc(category);
        } else {
            announcements = announcementRepository.findAllByOrderByPostedAtDesc();
        }
        return ResponseEntity.ok(announcements.stream().map(AnnouncementResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<AnnouncementResponse> create(
            @Valid @RequestBody AnnouncementRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        Announcement announcement = Announcement.builder()
            .title(request.title())
            .message(request.message())
            .category(request.category())
            .targetClassGroup(request.targetClassGroup() != null ? request.targetClassGroup() : "ALL")
            .postedBy(user.getFullName())
            .postedByUserId(user.getId())
            .build();

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(AnnouncementResponse.from(announcementRepository.save(announcement)));
    }
}

package com.knust.classmate.announcement;

import com.knust.classmate.audit.AuditService;
import com.knust.classmate.exception.ApiException;
import com.knust.classmate.notification.PushService;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import com.knust.classmate.user.UserRole;
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
    private final PushService pushService;
    private final AuditService auditService;

    @Autowired
    public AnnouncementController(AnnouncementRepository announcementRepository,
                                   UserRepository userRepository,
                                   PushService pushService,
                                   AuditService auditService) {
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
        this.pushService = pushService;
        this.auditService = auditService;
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

        Announcement saved = announcementRepository.save(announcement);
        pushService.notifyAll(request.category() + " announcement", request.title(), "/announcements");
        auditService.log("ANNOUNCEMENT_POSTED", request.category() + ": " + request.title());

        return ResponseEntity.status(HttpStatus.CREATED).body(AnnouncementResponse.from(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
        Announcement announcement = announcementRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found."));

        // Only the announcement's creator or an admin may delete it.
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isOwner = announcement.getPostedByUserId() != null
            && announcement.getPostedByUserId().equals(user.getId());
        if (!isAdmin && !isOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete announcements you posted.");
        }

        announcementRepository.delete(announcement);
        auditService.log("ANNOUNCEMENT_DELETED", announcement.getCategory() + ": " + announcement.getTitle());
        return ResponseEntity.noContent().build();
    }
}

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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementReadRepository readRepository;
    private final UserRepository userRepository;
    private final PushService pushService;
    private final AuditService auditService;

    @Autowired
    public AnnouncementController(AnnouncementRepository announcementRepository,
                                   AnnouncementReadRepository readRepository,
                                   UserRepository userRepository,
                                   PushService pushService,
                                   AuditService auditService) {
        this.announcementRepository = announcementRepository;
        this.readRepository = readRepository;
        this.userRepository = userRepository;
        this.pushService = pushService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>> getAll(
            @RequestParam(required = false) String category,
            Authentication authentication) {
        User user = currentUser(authentication);
        Set<Long> readIds = readRepository.findByUserId(user.getId()).stream()
            .map(AnnouncementRead::getAnnouncementId)
            .collect(Collectors.toSet());

        List<Announcement> announcements;
        if (category != null && !category.isBlank()) {
            announcements = announcementRepository.findByCategoryOrderByPostedAtDesc(category);
        } else {
            announcements = announcementRepository.findAllByOrderByPostedAtDesc();
        }
        return ResponseEntity.ok(announcements.stream()
            .map(a -> AnnouncementResponse.from(a, readIds.contains(a.getId())))
            .toList());
    }

    @PostMapping
    public ResponseEntity<AnnouncementResponse> create(
            @Valid @RequestBody AnnouncementRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);

        Announcement announcement = Announcement.builder()
            .title(request.title())
            .message(request.message())
            .category(request.category())
            .targetClassGroup(request.targetClassGroup() != null ? request.targetClassGroup() : "ALL")
            .postedBy(user.getFullName())
            .postedByUserId(user.getId())
            .build();

        Announcement saved = announcementRepository.save(announcement);
        pushService.notifyClassGroup(saved.getTargetClassGroup(),
            request.category() + " announcement", request.title(), "/announcements");
        auditService.log("ANNOUNCEMENT_POSTED", request.category() + ": " + request.title());

        return ResponseEntity.status(HttpStatus.CREATED).body(AnnouncementResponse.from(saved, false));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        Announcement announcement = announcementRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found."));

        // Only the announcement's creator or an admin may delete it.
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isOwner = announcement.getPostedByUserId() != null
            && announcement.getPostedByUserId().equals(user.getId());
        if (!isAdmin && !isOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete announcements you posted.");
        }

        readRepository.deleteByAnnouncementId(id);
        announcementRepository.delete(announcement);
        auditService.log("ANNOUNCEMENT_DELETED", announcement.getCategory() + ": " + announcement.getTitle());
        return ResponseEntity.noContent().build();
    }

    // Marks this announcement as read by the signed-in user. Idempotent — safe
    // to call more than once for the same announcement.
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        if (!announcementRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement not found.");
        }
        if (!readRepository.existsByAnnouncementIdAndUserId(id, user.getId())) {
            readRepository.save(new AnnouncementRead(id, user.getId()));
        }
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
    }
}

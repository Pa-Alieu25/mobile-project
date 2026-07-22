package com.knust.classmate.timetable;

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

import java.util.List;

@RestController
@RequestMapping("/timetable")
public class TimetableController {

    private final TimetableRepository timetableRepository;
    private final UserRepository userRepository;
    private final PushService pushService;
    private final AuditService auditService;

    @Autowired
    public TimetableController(TimetableRepository timetableRepository, UserRepository userRepository,
                               PushService pushService, AuditService auditService) {
        this.timetableRepository = timetableRepository;
        this.userRepository = userRepository;
        this.pushService = pushService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<TimetableRecord>> getAll(
            @RequestParam(required = false) String day) {
        if (day != null && !day.isBlank()) {
            return ResponseEntity.ok(timetableRepository.findByDayOfWeek(day));
        }
        return ResponseEntity.ok(timetableRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<TimetableRecord> create(@Valid @RequestBody TimetableRequest request,
                                                  Authentication authentication) {
        User user = currentUser(authentication);
        TimetableRecord record = TimetableRecord.builder()
            .courseCode(request.courseCode())
            .courseTitle(request.courseTitle())
            .dayOfWeek(request.dayOfWeek())
            .startTime(request.startTime())
            .endTime(request.endTime())
            .venue(request.venue())
            .lecturer(request.lecturer())
            .classGroup(request.classGroup())
            .status(request.status() != null ? request.status() : "active")
            .createdByUserId(user.getId())
            .build();
        TimetableRecord saved = timetableRepository.save(record);
        auditService.log("CLASS_ADDED", saved.getCourseCode() + " on " + saved.getDayOfWeek());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Update a class's status (e.g. mark it cancelled or restore it to active).
    @PutMapping("/{id}/status")
    public ResponseEntity<TimetableRecord> updateStatus(@PathVariable Long id,
                                                        @Valid @RequestBody StatusUpdateRequest request) {
        TimetableRecord record = timetableRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Class not found."));
        record.setStatus(request.status());
        TimetableRecord saved = timetableRepository.save(record);

        if ("cancelled".equalsIgnoreCase(request.status())) {
            pushService.notifyAll("Class cancelled",
                saved.getCourseCode() + " on " + saved.getDayOfWeek() + " has been cancelled.", "/timetable");
        }

        auditService.log("CLASS_STATUS_CHANGED",
            saved.getCourseCode() + " on " + saved.getDayOfWeek() + " → " + saved.getStatus());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        TimetableRecord record = timetableRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Class not found."));
        timetableRepository.deleteById(id);
        auditService.log("CLASS_DELETED", record.getCourseCode() + " on " + record.getDayOfWeek());
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
    }
}

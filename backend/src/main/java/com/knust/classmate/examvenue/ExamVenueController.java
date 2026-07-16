package com.knust.classmate.examvenue;

import com.knust.classmate.audit.AuditService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/exam-venues")
public class ExamVenueController {

    private final ExamVenueRepository examVenueRepository;
    private final AuditService auditService;

    @Autowired
    public ExamVenueController(ExamVenueRepository examVenueRepository, AuditService auditService) {
        this.examVenueRepository = examVenueRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<ExamVenue>> getAll() {
        return ResponseEntity.ok(examVenueRepository.findAll());
    }

    @GetMapping("/search")
    public ResponseEntity<List<ExamVenue>> search(@RequestParam String number) {
        try {
            Long indexNumber = Long.parseLong(number);
            return ResponseEntity.ok(examVenueRepository.findByIndexNumber(indexNumber));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping
    public ResponseEntity<ExamVenue> create(@Valid @RequestBody ExamVenueRequest request) {
        ExamVenue venue = ExamVenue.builder()
            .courseCode(request.courseCode())
            .courseTitle(request.courseTitle())
            .examDate(request.examDate())
            .examTime(request.examTime())
            .venue(request.venue())
            .buildingOrBlock(request.buildingOrBlock())
            .roomOrHall(request.roomOrHall())
            .startIndex(request.startIndex())
            .endIndex(request.endIndex())
            .status(request.status() != null ? request.status() : "pending")
            .build();

        ExamVenue saved = examVenueRepository.save(venue);
        auditService.log("EXAM_VENUE_ADDED",
            request.courseCode() + " (" + request.startIndex() + "–" + request.endIndex() + ")");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}

package com.knust.classmate.timetable;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/timetable")
public class TimetableController {

    private final TimetableRepository timetableRepository;

    @Autowired
    public TimetableController(TimetableRepository timetableRepository) {
        this.timetableRepository = timetableRepository;
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
    public ResponseEntity<TimetableRecord> create(@Valid @RequestBody TimetableRequest request) {
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
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(timetableRepository.save(record));
    }
}

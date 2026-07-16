package com.knust.classmate.audit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Under /admin so it is admin-only (see SecurityConfig).
@RestController
@RequestMapping("/admin/audit-logs")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @Autowired
    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> recent() {
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100)));
    }
}

package com.knust.classmate.audit;

import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Records who did what and when. Logging is best-effort — a failure to write an
 * audit entry never breaks the action that triggered it.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Autowired
    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    /** Log an action performed by the currently authenticated user. */
    public void log(String action, String detail) {
        String actorName = "System";
        String actorRole = "SYSTEM";

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null) {
            User user = userRepository.findByEmail(auth.getName()).orElse(null);
            if (user != null) {
                actorName = user.getFullName();
                actorRole = user.getRole().name();
            } else {
                actorName = auth.getName();
            }
        }
        save(action, detail, actorName, actorRole);
    }

    /** Log an action where the actor is known but not yet in the security context (e.g. login). */
    public void log(String action, String detail, String actorName, String actorRole) {
        save(action, detail, actorName, actorRole);
    }

    private void save(String action, String detail, String actorName, String actorRole) {
        try {
            AuditLog entry = new AuditLog();
            entry.setAction(action);
            entry.setDetail(detail);
            entry.setActorName(actorName);
            entry.setActorRole(actorRole);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to write audit log for action {}", action, e);
        }
    }
}

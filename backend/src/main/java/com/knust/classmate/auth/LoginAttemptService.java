package com.knust.classmate.auth;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory login rate limiter. After {@code MAX_ATTEMPTS} failed logins
 * for the same identifier within {@code WINDOW_MS}, further attempts are blocked
 * until the window expires. This slows down brute-force attacks. It is
 * per-instance (not distributed), which is sufficient for a single backend.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 15 * 60 * 1000L; // 15 minutes

    private static class Attempt {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long windowStart = System.currentTimeMillis();
    }

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String identifier) {
        Attempt attempt = attempts.get(key(identifier));
        if (attempt == null) return false;
        if (isExpired(attempt)) {
            attempts.remove(key(identifier));
            return false;
        }
        return attempt.count.get() >= MAX_ATTEMPTS;
    }

    public void recordFailure(String identifier) {
        Attempt attempt = attempts.computeIfAbsent(key(identifier), k -> new Attempt());
        if (isExpired(attempt)) {
            attempt.windowStart = System.currentTimeMillis();
            attempt.count.set(0);
        }
        attempt.count.incrementAndGet();
    }

    public void reset(String identifier) {
        attempts.remove(key(identifier));
    }

    private boolean isExpired(Attempt attempt) {
        return System.currentTimeMillis() - attempt.windowStart > WINDOW_MS;
    }

    private String key(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase();
    }
}

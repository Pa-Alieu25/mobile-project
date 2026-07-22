package com.knust.classmate.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

/**
 * Sends push notifications through Expo's push service. Delivery is best-effort
 * and asynchronous, so a failure to notify never breaks the request that
 * triggered it (posting an announcement, cancelling a class, etc.).
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    // Expo rejects a request with more than 100 messages in one call.
    private static final int MAX_MESSAGES_PER_REQUEST = 100;

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public PushService(DeviceTokenRepository deviceTokenRepository, UserRepository userRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.userRepository = userRepository;
    }

    /** Notify every registered device (students, reps, admins). */
    public void notifyAll(String title, String body, String screen) {
        List<String> tokens = deviceTokenRepository.findAll().stream()
            .map(DeviceToken::getExpoPushToken)
            .toList();
        send(tokens, title, body, screen);
    }

    /** Notify only the devices belonging to a specific user. */
    public void notifyUser(Long userId, String title, String body, String screen) {
        List<String> tokens = deviceTokenRepository.findByUserId(userId).stream()
            .map(DeviceToken::getExpoPushToken)
            .toList();
        send(tokens, title, body, screen);
    }

    /** Notify only the devices belonging to the given users. */
    public void notifyUsers(List<Long> userIds, String title, String body, String screen) {
        if (userIds.isEmpty()) return;
        List<String> tokens = deviceTokenRepository.findByUserIdIn(userIds).stream()
            .map(DeviceToken::getExpoPushToken)
            .toList();
        send(tokens, title, body, screen);
    }

    /**
     * Notify the audience a class group targets: every registered device if
     * {@code classGroup} is "ALL" (case-insensitive), otherwise only the users
     * whose {@code User.classGroup} matches.
     */
    public void notifyClassGroup(String classGroup, String title, String body, String screen) {
        if (classGroup == null || "ALL".equalsIgnoreCase(classGroup)) {
            notifyAll(title, body, screen);
            return;
        }
        List<Long> userIds = userRepository.findByClassGroup(classGroup).stream()
            .map(User::getId)
            .toList();
        notifyUsers(userIds, title, body, screen);
    }

    // `screen` is the in-app route the notification deep-links to when tapped.
    private void send(List<String> tokens, String title, String body, String screen) {
        if (tokens.isEmpty()) return;
        for (int i = 0; i < tokens.size(); i += MAX_MESSAGES_PER_REQUEST) {
            List<String> batch = tokens.subList(i, Math.min(i + MAX_MESSAGES_PER_REQUEST, tokens.size()));
            sendBatch(batch, title, body, screen);
        }
    }

    private void sendBatch(List<String> tokens, String title, String body, String screen) {
        try {
            List<Map<String, Object>> messages = tokens.stream()
                .map(t -> Map.<String, Object>of(
                    "to", t, "title", title, "body", body, "data", Map.of("url", screen)))
                .toList();
            String json = objectMapper.writeValueAsString(messages);

            HttpRequest request = HttpRequest.newBuilder(URI.create(EXPO_PUSH_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

            // Fire and forget — do not block the caller on the push round-trip.
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .exceptionally(ex -> {
                    log.warn("Push notification send failed", ex);
                    return null;
                });
        } catch (Exception e) {
            log.warn("Push notification could not be built", e);
        }
    }
}

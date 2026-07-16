package com.knust.classmate.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final DeviceTokenRepository deviceTokenRepository;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public PushService(DeviceTokenRepository deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
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

    // `screen` is the in-app route the notification deep-links to when tapped.
    private void send(List<String> tokens, String title, String body, String screen) {
        if (tokens.isEmpty()) return;
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

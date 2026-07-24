package com.knust.classmate.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knust.classmate.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

/**
 * Wraps HTTP calls to Paystack's REST API. Uses the same plain java.net.http.HttpClient
 * approach as PushService (this project has no RestTemplate/WebClient dependency).
 * The secret key never leaves this class — it is read once from the environment
 * (PAYSTACK_SECRET_KEY) and used only for outgoing Authorization headers and
 * webhook signature verification.
 */
@Service
public class PaystackClient {

    private static final Logger log = LoggerFactory.getLogger(PaystackClient.class);
    private static final String BASE_URL = "https://api.paystack.co";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${paystack.secret-key:}")
    private String secretKey;

    public PaystackInitializeResult initializeTransaction(
            String email, int amountInPesewas, String currency, String reference, String callbackUrl) {
        JsonNode data = post("/transaction/initialize", Map.of(
            "email", email,
            "amount", amountInPesewas,
            "currency", currency,
            "reference", reference,
            "callback_url", callbackUrl
        ));
        return new PaystackInitializeResult(
            data.path("authorization_url").asText(),
            data.path("reference").asText()
        );
    }

    public PaystackVerifyResult verifyTransaction(String reference) {
        String encoded = URLEncoder.encode(reference, StandardCharsets.UTF_8);
        JsonNode data = get("/transaction/verify/" + encoded);
        return new PaystackVerifyResult(
            data.path("status").asText(),
            data.path("amount").asInt(),
            data.path("reference").asText()
        );
    }

    /** Constant-time comparison of the x-paystack-signature header against our own HMAC SHA512 of the raw body. */
    public boolean isValidWebhookSignature(String rawBody, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) return false;
        ensureConfigured();
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] computed = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return MessageDigest.isEqual(
                computedHex.getBytes(StandardCharsets.UTF_8),
                signatureHeader.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.warn("Failed to compute webhook signature", e);
            return false;
        }
    }

    private JsonNode post(String path, Map<String, Object> body) {
        ensureConfigured();
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            return send(request);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack request failed: POST {}", path, e);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Could not reach Paystack. Please try again.");
        }
    }

    private JsonNode get(String path) {
        ensureConfigured();
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + secretKey)
                .GET()
                .build();
            return send(request);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Paystack request failed: GET {}", path, e);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Could not reach Paystack. Please try again.");
        }
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode json = objectMapper.readTree(response.body());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String message = json.path("message").asText("Paystack request failed.");
            log.warn("Paystack returned {} for {}: {}", response.statusCode(), request.uri(), message);
            throw new ApiException(HttpStatus.BAD_GATEWAY, message);
        }
        return json.path("data");
    }

    private void ensureConfigured() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Payments are not configured on this server.");
        }
    }
}

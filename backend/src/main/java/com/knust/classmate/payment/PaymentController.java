package com.knust.classmate.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knust.classmate.audit.AuditService;
import com.knust.classmate.exception.ApiException;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    // The only plan today, priced to match subscription.ts's PRO_PRICE_GHS (10
    // GHS). Server-side source of truth for what a payment is allowed to cost —
    // a client-sent amount is only ever checked against this, never trusted to
    // set the actual charge.
    private static final Map<String, Integer> PLAN_PRICES_PESEWAS = Map.of("PRO_SEMESTER", 1000);
    private static final String DEFAULT_PLAN = "PRO_SEMESTER";
    private static final String CURRENCY = "GHS";

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaystackClient paystackClient;
    private final PaymentService paymentService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.base-url:http://localhost:8080/api}")
    private String appBaseUrl;

    @Autowired
    public PaymentController(PaymentRepository paymentRepository, UserRepository userRepository,
                             PaystackClient paystackClient, PaymentService paymentService,
                             AuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.paystackClient = paystackClient;
        this.paymentService = paymentService;
        this.auditService = auditService;
    }

    @PostMapping("/initialize")
    public ResponseEntity<InitializeResponse> initialize(@RequestBody(required = false) InitializeRequest request,
                                                          Authentication authentication) {
        User user = currentUser(authentication);

        String plan = (request != null && request.plan() != null) ? request.plan() : DEFAULT_PLAN;
        Integer canonicalAmount = PLAN_PRICES_PESEWAS.get(plan);
        if (canonicalAmount == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown plan.");
        }
        if (request != null && request.amount() != null && !request.amount().equals(canonicalAmount)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid amount for this plan.");
        }

        String reference = "CM-" + UUID.randomUUID();

        // Save PENDING before calling Paystack, so a reference always resolves
        // to a record even if the Paystack call itself fails partway through.
        Payment payment = Payment.builder()
            .reference(reference)
            .userId(user.getId())
            .amount(canonicalAmount)
            .currency(CURRENCY)
            .status(PaymentStatus.PENDING)
            .build();
        paymentRepository.save(payment);

        String callbackUrl = appBaseUrl + "/payments/callback";
        PaystackInitializeResult result = paystackClient.initializeTransaction(
            user.getEmail(), canonicalAmount, CURRENCY, reference, callbackUrl);

        auditService.log("PAYMENT_INITIALIZED", plan + " (" + reference + ")");
        return ResponseEntity.ok(new InitializeResponse(result.authorizationUrl(), reference));
    }

    @GetMapping("/verify/{reference}")
    public ResponseEntity<VerifyResponse> verify(@PathVariable String reference, Authentication authentication) {
        User user = currentUser(authentication);
        Payment payment = paymentRepository.findByReference(reference)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found."));

        if (!payment.getUserId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This payment does not belong to you.");
        }

        // Idempotent: already-confirmed payments are never re-processed or
        // re-checked against Paystack.
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return ResponseEntity.ok(VerifyResponse.from(payment));
        }

        PaystackVerifyResult result = paystackClient.verifyTransaction(reference);
        switch (result.status().toLowerCase()) {
            case "success" -> {
                if (result.amount() == payment.getAmount()) {
                    payment.setPaystackReference(result.reference());
                    payment = paymentService.markSuccess(payment);
                    auditService.log("PAYMENT_SUCCEEDED", reference);
                } else {
                    log.warn("Paystack amount {} did not match recorded amount {} for {}",
                        result.amount(), payment.getAmount(), reference);
                    payment = paymentService.markStatus(payment, PaymentStatus.FAILED);
                }
            }
            case "failed" -> payment = paymentService.markStatus(payment, PaymentStatus.FAILED);
            case "abandoned" -> payment = paymentService.markStatus(payment, PaymentStatus.ABANDONED);
            default -> { /* still pending/processing on Paystack's side — leave PENDING for the client to poll again */ }
        }

        return ResponseEntity.ok(VerifyResponse.from(payment));
    }

    // Paystack sends no JWT — the HMAC signature over the raw body IS the
    // authentication (see SecurityConfig, which permits this route). The body
    // is bound as a raw String, not deserialized, because the signature is
    // computed over the exact bytes Paystack sent.
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String rawBody,
                                        @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        if (!paystackClient.isValidWebhookSignature(rawBody, signature)) {
            log.warn("Rejected webhook with invalid signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        JsonNode event;
        try {
            event = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            // Valid signature but unparsable body — nothing sane to retry into; ack so Paystack stops resending it.
            log.warn("Could not parse webhook body despite a valid signature", e);
            return ResponseEntity.ok().build();
        }

        if ("charge.success".equals(event.path("event").asText())) {
            JsonNode data = event.path("data");
            String reference = data.path("reference").asText();
            int amount = data.path("amount").asInt();

            paymentRepository.findByReference(reference).ifPresentOrElse(payment -> {
                if (amount == payment.getAmount()) {
                    payment.setPaystackReference(reference);
                    paymentService.markSuccess(payment);
                    auditService.log("PAYMENT_SUCCEEDED", reference + " (via webhook)");
                } else {
                    log.warn("Webhook amount {} did not match recorded amount {} for {}",
                        amount, payment.getAmount(), reference);
                }
            }, () -> log.warn("Webhook charge.success for unknown reference {}", reference));
        }

        // Always 200 once the signature checks out, for any event — retrying
        // won't change an outcome we've already handled (or intentionally ignored).
        return ResponseEntity.ok().build();
    }

    // Where Paystack's checkout page redirects the browser after payment. The
    // app never relies on this for correctness (WebBrowser.openBrowserAsync
    // can't intercept it) — it only exists so the redirect lands on a sensible
    // page instead of a 404 while the user closes the browser and returns to the app.
    @GetMapping(value = "/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback() {
        String html = """
            <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Payment received</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:48px 20px;">
              <h2>Thanks!</h2>
              <p>You can close this window and return to the ClassMate app.</p>
            </body></html>
            """;
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_HTML_VALUE).body(html);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
    }
}

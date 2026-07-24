package com.knust.classmate.payment;

import com.knust.classmate.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Shared, idempotent payment status transitions used by both the client-facing
 * verify endpoint and the Paystack webhook — the two paths that can each
 * independently observe a "success" first, so both funnel through here.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Autowired
    public PaymentService(PaymentRepository paymentRepository, UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }

    /**
     * Marks the payment SUCCESS and unlocks Pro for its owner. A no-op if the
     * payment is already SUCCESS — this is what makes a Paystack webhook retry
     * (or a verify call racing the webhook) safe to run twice.
     */
    @Transactional
    public Payment markSuccess(Payment payment) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return payment;
        }
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(LocalDateTime.now());
        Payment saved = paymentRepository.save(payment);
        unlockPro(payment.getUserId());
        return saved;
    }

    /** Never downgrades a payment that's already SUCCESS. */
    @Transactional
    public Payment markStatus(Payment payment, PaymentStatus status) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return payment;
        }
        payment.setStatus(status);
        return paymentRepository.save(payment);
    }

    private void unlockPro(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!user.isProActive()) {
                user.setProActive(true);
                userRepository.save(user);
            }
        });
        log.info("Unlocked Pro for userId={}", userId);
    }
}

package com.knust.classmate.payment;

import java.time.LocalDateTime;

public record VerifyResponse(String reference, String status, Integer amount, LocalDateTime paidAt) {
    public static VerifyResponse from(Payment payment) {
        return new VerifyResponse(
            payment.getReference(),
            payment.getStatus().name(),
            payment.getAmount(),
            payment.getPaidAt()
        );
    }
}

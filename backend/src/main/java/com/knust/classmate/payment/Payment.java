package com.knust.classmate.payment;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Our own generated reference ("CM-" + UUID), sent to Paystack as the
    // transaction reference — this is what we look payments up by, both from
    // the client's verify call and from the webhook payload.
    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private Long userId;

    // Smallest currency unit (pesewas for GHS), matching what Paystack expects
    // and returns — never a decimal amount, to avoid rounding ambiguity.
    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private String currency = "GHS";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    // The reference Paystack's own records associate with this transaction.
    // In practice this equals `reference` (we always supply our own), but it's
    // captured separately from what verify/webhook actually returns.
    @Column
    private String paystackReference;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime paidAt;

    public Payment() {}

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getAmount() { return amount; }
    public void setAmount(Integer amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }
    public String getPaystackReference() { return paystackReference; }
    public void setPaystackReference(String paystackReference) { this.paystackReference = paystackReference; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String reference, currency = "GHS", paystackReference;
        private Long userId;
        private Integer amount;
        private PaymentStatus status = PaymentStatus.PENDING;

        public Builder reference(String v) { this.reference = v; return this; }
        public Builder userId(Long v) { this.userId = v; return this; }
        public Builder amount(Integer v) { this.amount = v; return this; }
        public Builder currency(String v) { this.currency = v; return this; }
        public Builder status(PaymentStatus v) { this.status = v; return this; }
        public Builder paystackReference(String v) { this.paystackReference = v; return this; }

        public Payment build() {
            Payment p = new Payment();
            p.reference = this.reference;
            p.userId = this.userId;
            p.amount = this.amount;
            p.currency = this.currency;
            p.status = this.status;
            p.paystackReference = this.paystackReference;
            return p;
        }
    }
}

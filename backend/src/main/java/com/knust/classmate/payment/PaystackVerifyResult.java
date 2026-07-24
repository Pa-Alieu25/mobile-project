package com.knust.classmate.payment;

// `status` is Paystack's own transaction status string ("success", "failed",
// "abandoned", or a transient value like "pending"/"processing" — anything
// other than the first three should be treated as still in progress).
public record PaystackVerifyResult(String status, int amount, String reference) {}

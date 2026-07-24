package com.knust.classmate.payment;

// Both fields are optional and are only ever used to VALIDATE against our own
// server-side plan prices (see PaymentController.PLAN_PRICES_PESEWAS) — the
// actual amount charged always comes from that server-side map, never from
// whatever the client sends here.
public record InitializeRequest(String plan, Integer amount) {}

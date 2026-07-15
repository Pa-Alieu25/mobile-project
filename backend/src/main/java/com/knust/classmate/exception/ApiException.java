package com.knust.classmate.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown for expected, user-facing business errors (duplicate account,
 * pending approval, etc.) so they map to a proper HTTP status and message
 * instead of a generic 500.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

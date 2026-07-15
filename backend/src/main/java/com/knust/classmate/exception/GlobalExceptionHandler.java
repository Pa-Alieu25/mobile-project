package com.knust.classmate.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Turns exceptions thrown by controllers into consistent JSON responses of the
 * form {"message": "..."} with a meaningful status code, which the mobile app
 * reads via `data.message`.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Map<String, String>> body(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> handleApi(ApiException ex) {
        return body(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler({ BadCredentialsException.class, UsernameNotFoundException.class })
    public ResponseEntity<Map<String, String>> handleBadCredentials(RuntimeException ex) {
        return body(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "Please check your details and try again.";
        return body(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.");
    }
}

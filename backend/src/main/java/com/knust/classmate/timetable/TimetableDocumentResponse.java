package com.knust.classmate.timetable;

/** Timetable document metadata (no bytes) returned to clients. */
public record TimetableDocumentResponse(
    Long id,
    String originalName,
    String mimeType,
    long size,
    String uploadedBy,
    String uploadedAt
) {
    public static TimetableDocumentResponse from(TimetableDocument d) {
        return new TimetableDocumentResponse(
            d.getId(),
            d.getOriginalName(),
            d.getMimeType(),
            d.getSize(),
            d.getUploadedBy(),
            d.getUploadedAtFormatted()
        );
    }
}

package com.knust.classmate.assignment;

/** Assignment plus the requesting student's own completion status. */
public record AssignmentResponse(
    Long id,
    String courseCode,
    String title,
    String description,
    String dueDate,
    String classGroup,
    String postedBy,
    Long postedByUserId,
    String documentName,
    String documentType,
    Long documentSize,
    boolean completed
) {
    public static AssignmentResponse from(Assignment a, boolean completed) {
        return new AssignmentResponse(
            a.getId(),
            a.getCourseCode(),
            a.getTitle(),
            a.getDescription(),
            a.getDueDate(),
            a.getClassGroup(),
            a.getPostedBy(),
            a.getPostedByUserId(),
            a.getDocumentName(),
            a.getDocumentType(),
            a.getDocumentSize(),
            completed
        );
    }
}

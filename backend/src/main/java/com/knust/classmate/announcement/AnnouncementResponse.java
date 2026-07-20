package com.knust.classmate.announcement;

public record AnnouncementResponse(
    Long id,
    String title,
    String message,
    String category,
    String targetClassGroup,
    String postedBy,
    Long postedByUserId,
    String postedAt,
    boolean read
) {
    public static AnnouncementResponse from(Announcement a, boolean read) {
        return new AnnouncementResponse(
            a.getId(),
            a.getTitle(),
            a.getMessage(),
            a.getCategory(),
            a.getTargetClassGroup(),
            a.getPostedBy(),
            a.getPostedByUserId(),
            a.getPostedAtFormatted(),
            read
        );
    }
}

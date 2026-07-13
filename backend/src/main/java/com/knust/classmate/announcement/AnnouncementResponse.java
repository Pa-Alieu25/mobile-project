package com.knust.classmate.announcement;

public record AnnouncementResponse(
    Long id,
    String title,
    String message,
    String category,
    String targetClassGroup,
    String postedBy,
    String postedAt
) {
    public static AnnouncementResponse from(Announcement a) {
        return new AnnouncementResponse(
            a.getId(),
            a.getTitle(),
            a.getMessage(),
            a.getCategory(),
            a.getTargetClassGroup(),
            a.getPostedBy(),
            a.getPostedAtFormatted()
        );
    }
}

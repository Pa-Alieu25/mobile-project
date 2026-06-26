package com.knust.classmate.announcement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByPostedAtDesc();
    List<Announcement> findByCategoryOrderByPostedAtDesc(String category);
}

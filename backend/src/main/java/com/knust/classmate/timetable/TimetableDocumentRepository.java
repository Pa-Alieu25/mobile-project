package com.knust.classmate.timetable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimetableDocumentRepository extends JpaRepository<TimetableDocument, Long> {
    List<TimetableDocument> findAllByOrderByUploadedAtDesc();
}

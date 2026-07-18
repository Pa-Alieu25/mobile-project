package com.knust.classmate.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AssignmentDocumentRepository extends JpaRepository<AssignmentDocument, Long> {
    Optional<AssignmentDocument> findByAssignmentId(Long assignmentId);
    void deleteByAssignmentId(Long assignmentId);
}

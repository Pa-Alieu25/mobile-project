package com.knust.classmate.assignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentCompletionRepository extends JpaRepository<AssignmentCompletion, Long> {
    List<AssignmentCompletion> findByUserId(Long userId);
    Optional<AssignmentCompletion> findByAssignmentIdAndUserId(Long assignmentId, Long userId);
    void deleteByAssignmentIdAndUserId(Long assignmentId, Long userId);
    void deleteByAssignmentId(Long assignmentId);
}

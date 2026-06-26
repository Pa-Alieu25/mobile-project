package com.knust.classmate.examvenue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamVenueRepository extends JpaRepository<ExamVenue, Long> {

    @Query("SELECT e FROM ExamVenue e WHERE :number >= e.startIndex AND :number <= e.endIndex")
    List<ExamVenue> findByIndexNumber(@Param("number") Long number);
}

package com.knust.classmate.score;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MidsemScoreRepository extends JpaRepository<MidsemScore, Long> {

    // Case-insensitive so it matches however the index number was stored/typed.
    @Query("SELECT s FROM MidsemScore s WHERE LOWER(s.indexNumber) = LOWER(:indexNumber) " +
           "ORDER BY s.uploadedAt DESC")
    List<MidsemScore> findByIndexNumber(@Param("indexNumber") String indexNumber);
}

package com.knust.classmate.score;

import java.util.List;

/** Summary of a bulk score upload: how many rows were received, how many saved,
 * and which identifiers could not be matched to a student. */
public record BulkScoreResponse(
    int received,
    int added,
    List<String> unmatched
) {}

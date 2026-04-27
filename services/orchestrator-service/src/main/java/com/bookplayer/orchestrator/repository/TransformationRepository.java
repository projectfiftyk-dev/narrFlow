package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.domain.transformation.TransformationVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface TransformationRepository extends MongoRepository<Transformation, String> {
    List<Transformation> findByUserId(String userId);
    long countByUserId(String userId);
    List<Transformation> findByStatus(TransformationStatus status);

    // Own (any state) OR public+DONE — hardcoded values avoid unreliable enum binding in @Query
    @Query("{ '$or': [ { 'userId': ?0 }, { 'visibility': 'PUBLIC', 'status': 'DONE' } ] }")
    Page<Transformation> findVisibleToUser(String userId, Pageable pageable);

    @Query("{ '$and': [ { '$or': [ { 'userId': ?0 }, { 'visibility': 'PUBLIC', 'status': 'DONE' } ] }, { 'name': { '$regex': ?1, '$options': 'i' } } ] }")
    Page<Transformation> findVisibleToUserAndNameContaining(String userId, String namePattern, Pageable pageable);

    // Anonymous — only public+DONE; use derived methods so Spring Data applies type converters correctly
    Page<Transformation> findByVisibilityAndStatus(TransformationVisibility visibility, TransformationStatus status, Pageable pageable);

    Page<Transformation> findByVisibilityAndStatusAndNameContainingIgnoreCase(TransformationVisibility visibility, TransformationStatus status, String name, Pageable pageable);

    Page<Transformation> findByNameContainingIgnoreCase(String name, Pageable pageable);
}

package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.domain.transformation.TransformationVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface TransformationRepository extends MongoRepository<Transformation, String> {
    List<Transformation> findByUserId(String userId);
    long countByUserId(String userId);
    List<Transformation> findByStatus(TransformationStatus status);

    long countByUserIdAndCreatedAtAfter(String userId, LocalDateTime after);

    @Query("{ '$or': [ { 'userId': ?0 }, { 'visibility': ?1 } ] }")
    Page<Transformation> findVisibleToUser(String userId, TransformationVisibility visibility, Pageable pageable);

    @Query("{ '$and': [ { '$or': [ { 'userId': ?0 }, { 'visibility': ?1 } ] }, { 'name': { '$regex': ?2, '$options': 'i' } } ] }")
    Page<Transformation> findVisibleToUserAndNameContaining(String userId, TransformationVisibility visibility, String namePattern, Pageable pageable);

    Page<Transformation> findByVisibility(TransformationVisibility visibility, Pageable pageable);

    Page<Transformation> findByVisibilityAndNameContainingIgnoreCase(TransformationVisibility visibility, String name, Pageable pageable);

    Page<Transformation> findByNameContainingIgnoreCase(String name, Pageable pageable);
}

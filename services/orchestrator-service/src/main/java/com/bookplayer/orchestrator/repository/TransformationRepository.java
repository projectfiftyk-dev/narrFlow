package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TransformationRepository extends MongoRepository<Transformation, String> {
    List<Transformation> findByUserId(String userId);
    long countByUserId(String userId);
    List<Transformation> findByStatus(TransformationStatus status);
}

package com.bookplayer.orchestrator.transformation;

import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TransformationRepository extends MongoRepository<Transformation, String> {
    List<Transformation> findByUserId(String userId);
    long countByUserId(String userId);
    List<Transformation> findByStatus(TransformationStatus status);
}

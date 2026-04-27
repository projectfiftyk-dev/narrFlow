package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.content.Content;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ContentRepository extends MongoRepository<Content, String> {
    Optional<Content> findByTransformationId(String transformationId);
    void deleteByTransformationId(String transformationId);
}

package com.bookplayer.orchestrator.content;

import com.bookplayer.orchestrator.content.model.Content;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ContentRepository extends MongoRepository<Content, String> {
    Optional<Content> findByTransformationId(String transformationId);
}

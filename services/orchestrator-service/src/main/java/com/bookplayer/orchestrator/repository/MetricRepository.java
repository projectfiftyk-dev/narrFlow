package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.metrics.MetricEvent;
import com.bookplayer.orchestrator.domain.metrics.MetricEventType;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MetricRepository extends MongoRepository<MetricEvent, String> {
    long countByEventType(MetricEventType eventType);
}

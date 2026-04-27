package com.bookplayer.orchestrator.services.metrics;

public interface MetricService {
    void recordTransformationCreated(String transformationId, String userId);
    void recordTransformationCompleted(String transformationId);
    void recordTransformationFailed(String transformationId);
    void recordContentAccessed(String transformationId, String userId);
}

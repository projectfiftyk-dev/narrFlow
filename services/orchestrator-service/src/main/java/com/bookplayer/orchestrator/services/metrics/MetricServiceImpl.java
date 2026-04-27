package com.bookplayer.orchestrator.services.metrics;

import com.bookplayer.orchestrator.domain.metrics.MetricEvent;
import com.bookplayer.orchestrator.domain.metrics.MetricEventType;
import com.bookplayer.orchestrator.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class MetricServiceImpl implements MetricService {

    private final MetricRepository metricRepository;

    @Override
    public void recordTransformationCreated(String transformationId, String userId) {
        append(MetricEventType.TRANSFORMATION_CREATED, transformationId, userId);
    }

    @Override
    public void recordTransformationCompleted(String transformationId) {
        append(MetricEventType.TRANSFORMATION_COMPLETED, transformationId, null);
    }

    @Override
    public void recordTransformationFailed(String transformationId) {
        append(MetricEventType.TRANSFORMATION_FAILED, transformationId, null);
    }

    @Override
    public void recordContentAccessed(String transformationId, String userId) {
        append(MetricEventType.CONTENT_ACCESSED, transformationId, userId);
    }

    private void append(MetricEventType eventType, String transformationId, String userId) {
        try {
            metricRepository.save(MetricEvent.builder()
                    .eventType(eventType)
                    .transformationId(transformationId)
                    .userId(userId)
                    .timestamp(LocalDateTime.now())
                    .build());
            log.debug("Metric recorded: type={} transformationId={}", eventType, transformationId);
        } catch (Exception e) {
            log.error("Failed to record metric type={} transformationId={}: {}", eventType, transformationId, e.getMessage());
        }
    }
}

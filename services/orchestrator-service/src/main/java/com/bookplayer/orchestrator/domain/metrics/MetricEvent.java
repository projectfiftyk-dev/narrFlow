package com.bookplayer.orchestrator.domain.metrics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "metrics")
public class MetricEvent {
    @Id
    private String id;
    @Indexed
    private MetricEventType eventType;
    @Indexed
    private String transformationId;
    private String userId; // null for anonymous access
    @Indexed
    private LocalDateTime timestamp;
}

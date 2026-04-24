package com.bookplayer.orchestrator.domain.transformation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transformations")
public class Transformation {
    @Id
    private String id;
    private String userId;
    private String bookId;
    private TransformationStatus status;
    private Map<String, String> voiceMapping; // author -> voiceId
    private String ttsTaskId;
    private List<String> segmentSectionIds; // index == segmentNumber, value == sectionId
    private List<String> segmentAuthors;    // index == segmentNumber, value == author
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

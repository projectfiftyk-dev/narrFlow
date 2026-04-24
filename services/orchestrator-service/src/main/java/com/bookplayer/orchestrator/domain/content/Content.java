package com.bookplayer.orchestrator.domain.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "content")
public class Content {
    @Id
    private String id;
    private String bookId;
    private String transformationId;
    private List<ContentItem> items;
}

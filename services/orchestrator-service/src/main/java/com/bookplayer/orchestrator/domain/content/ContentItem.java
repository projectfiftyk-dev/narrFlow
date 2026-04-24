package com.bookplayer.orchestrator.domain.content;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentItem {
    private String sectionId;
    private String sectionName;
    private String author;
    private String text;
    private String audioUri;
    private String voiceId;
}

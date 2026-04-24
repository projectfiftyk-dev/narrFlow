package com.bookplayer.orchestrator.content.model;

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
    private String text;
    private String audioUri;
    private String personaId;
}

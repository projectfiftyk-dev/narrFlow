package com.bookplayer.orchestrator.tts.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TtsSegmentInput {
    private int segmentNumber;
    private String text;
    private String voiceId;
    private String personaId;
    private String transformationId;
}

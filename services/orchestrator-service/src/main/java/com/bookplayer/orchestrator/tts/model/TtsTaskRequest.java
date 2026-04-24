package com.bookplayer.orchestrator.tts.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TtsTaskRequest {
    private List<TtsSegmentInput> segments;
}

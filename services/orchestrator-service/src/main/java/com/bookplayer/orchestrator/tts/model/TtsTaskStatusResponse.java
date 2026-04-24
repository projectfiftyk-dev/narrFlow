package com.bookplayer.orchestrator.tts.model;

import java.util.List;

public record TtsTaskStatusResponse(
        String taskId,
        String status,
        List<TtsSegmentResult> result,
        String error
) {}

package com.bookplayer.orchestrator.transfer.tts;

import java.util.List;

public record TtsTaskStatusResponse(
        String taskId,
        String status,
        List<TtsSegmentResult> result,
        String error
) {}

package com.bookplayer.orchestrator.tts.model;

import java.util.List;

public record TtsContentResponse(
        String taskId,
        String status,
        List<TtsResolvedSegment> segments
) {}

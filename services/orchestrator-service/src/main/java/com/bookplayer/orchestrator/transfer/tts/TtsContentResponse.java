package com.bookplayer.orchestrator.transfer.tts;

import java.util.List;

public record TtsContentResponse(
        String taskId,
        String status,
        List<TtsResolvedSegment> segments
) {}

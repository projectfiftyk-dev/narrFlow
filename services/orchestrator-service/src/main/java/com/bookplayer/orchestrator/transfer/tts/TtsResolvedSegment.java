package com.bookplayer.orchestrator.transfer.tts;

public record TtsResolvedSegment(
        int segmentNumber,
        String text,
        String audioUrl
) {}

package com.bookplayer.orchestrator.tts.model;

public record TtsResolvedSegment(
        int segmentNumber,
        String text,
        String personaId,
        String audioUrl
) {}

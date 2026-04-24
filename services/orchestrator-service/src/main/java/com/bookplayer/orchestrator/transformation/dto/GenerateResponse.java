package com.bookplayer.orchestrator.transformation.dto;

public record GenerateResponse(
        String transformationId,
        String status,
        String ttsTaskId
) {}

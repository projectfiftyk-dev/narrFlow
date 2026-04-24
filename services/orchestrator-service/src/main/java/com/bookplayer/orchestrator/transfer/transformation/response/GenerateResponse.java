package com.bookplayer.orchestrator.transfer.transformation.response;

public record GenerateResponse(
        String transformationId,
        String status,
        String ttsTaskId
) {}

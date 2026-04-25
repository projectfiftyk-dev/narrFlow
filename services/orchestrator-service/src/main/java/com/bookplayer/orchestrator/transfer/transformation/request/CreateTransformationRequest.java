package com.bookplayer.orchestrator.transfer.transformation.request;

import jakarta.validation.constraints.NotBlank;

public record CreateTransformationRequest(
        @NotBlank String bookId,
        @NotBlank String name
) {}

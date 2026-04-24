package com.bookplayer.orchestrator.persona.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePersonaRequest(
        @NotBlank String bookId,
        @NotBlank String name,
        @NotBlank String voiceId
) {}

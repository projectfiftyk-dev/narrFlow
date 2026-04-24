package com.bookplayer.orchestrator.transformation.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTransformationRequest(@NotBlank String bookId) {}

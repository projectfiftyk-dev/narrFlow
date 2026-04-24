package com.bookplayer.orchestrator.transformation.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

public record UpdatePersonaMappingRequest(@NotEmpty Map<String, String> personaMapping) {}

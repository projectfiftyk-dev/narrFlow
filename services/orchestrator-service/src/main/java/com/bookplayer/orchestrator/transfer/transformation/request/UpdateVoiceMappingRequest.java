package com.bookplayer.orchestrator.transfer.transformation.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.Map;

public record UpdateVoiceMappingRequest(@NotEmpty Map<String, String> voiceMapping) {}

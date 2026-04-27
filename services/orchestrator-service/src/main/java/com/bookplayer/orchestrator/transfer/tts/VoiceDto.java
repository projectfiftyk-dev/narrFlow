package com.bookplayer.orchestrator.transfer.tts;

import java.util.List;

public record VoiceDto(String id, String slug, String friendlyName, String description, List<VoiceTestSample> tests) {}

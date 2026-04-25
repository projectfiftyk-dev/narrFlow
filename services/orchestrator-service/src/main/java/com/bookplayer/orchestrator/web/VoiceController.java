package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.security.SecurityUtils;
import com.bookplayer.orchestrator.services.tts.TtsClient;
import com.bookplayer.orchestrator.transfer.tts.VoiceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/voices")
@RequiredArgsConstructor
public class VoiceController {

    private final TtsClient ttsClient;

    @GetMapping
    public List<VoiceDto> getVoices() {
        SecurityUtils.requireAuthenticated();
        log.debug("GET /voices");
        return ttsClient.getVoices();
    }
}

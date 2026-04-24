package com.bookplayer.orchestrator.tts;

import com.bookplayer.orchestrator.tts.model.VoiceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/voices")
@RequiredArgsConstructor
public class VoiceController {

    private final TtsClient ttsClient;

    @GetMapping
    public List<VoiceDto> getVoices() {
        return ttsClient.getVoices();
    }
}

package com.bookplayer.orchestrator.services.tts;

import com.bookplayer.orchestrator.transfer.tts.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TtsClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${tts.service.base-url}")
    private String ttsBaseUrl;

    public String createTask(TtsTaskRequest request) {
        String url = ttsBaseUrl + "/tts/tasks";
        try {
            String jsonBody = objectMapper.writeValueAsString(request);
            log.debug("Sending TTS task to {}: {}", url, jsonBody);

            RequestEntity<String> requestEntity = RequestEntity
                    .post(URI.create(url))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonBody);

            ResponseEntity<TtsCreateResponse> response = restTemplate.exchange(requestEntity, TtsCreateResponse.class);

            if (response.getBody() == null) {
                throw new RuntimeException("Empty response from TTS service on task creation");
            }
            log.info("TTS task created: taskId={}", response.getBody().taskId());
            return response.getBody().taskId();
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize TTS task request", e);
        }
    }

    public TtsTaskStatusResponse getTaskStatus(String taskId) {
        String url = ttsBaseUrl + "/tts/tasks/" + taskId;
        log.debug("Polling TTS task status: taskId={}", taskId);
        return restTemplate.getForObject(url, TtsTaskStatusResponse.class);
    }

    public TtsContentResponse getTaskContent(String taskId) {
        String url = ttsBaseUrl + "/tts/tasks/" + taskId + "/content";
        log.debug("Fetching TTS task content: taskId={}", taskId);
        return restTemplate.getForObject(url, TtsContentResponse.class);
    }

    public List<VoiceDto> getVoices() {
        String url = ttsBaseUrl + "/voices";
        log.debug("Fetching voices from TTS service");
        ResponseEntity<List<VoiceDto>> response = restTemplate.exchange(
                url, HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        List<VoiceDto> voices = response.getBody();
        log.debug("Received {} voices from TTS service", voices != null ? voices.size() : 0);
        return voices;
    }
}

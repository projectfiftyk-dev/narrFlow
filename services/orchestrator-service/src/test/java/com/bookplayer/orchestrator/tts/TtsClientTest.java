package com.bookplayer.orchestrator.tts;

import com.bookplayer.orchestrator.tts.model.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TtsClientTest {

    @Mock
    RestTemplate restTemplate;

    @Mock
    ObjectMapper objectMapper;

    @InjectMocks
    TtsClient ttsClient;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ttsClient, "ttsBaseUrl", "http://localhost:8001");
    }

    @Test
    void createTask_returnsTaskIdFromResponse() throws JsonProcessingException {
        TtsTaskRequest request = new TtsTaskRequest(List.of());
        TtsCreateResponse createResponse = new TtsCreateResponse("accepted", "task-xyz");

        when(objectMapper.writeValueAsString(request)).thenReturn("{\"segments\":[]}");
        when(restTemplate.postForEntity(eq("http://localhost:8001/tts/tasks"), any(HttpEntity.class), eq(TtsCreateResponse.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.ACCEPTED).body(createResponse));

        String taskId = ttsClient.createTask(request);

        assertThat(taskId).isEqualTo("task-xyz");
    }

    @Test
    void createTask_nullBody_throwsRuntimeException() throws JsonProcessingException {
        TtsTaskRequest request = new TtsTaskRequest(List.of());
        when(objectMapper.writeValueAsString(request)).thenReturn("{\"segments\":[]}");
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(TtsCreateResponse.class)))
                .thenReturn(ResponseEntity.ok(null));

        assertThatThrownBy(() -> ttsClient.createTask(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Empty response");
    }

    @Test
    void createTask_serializationFailure_throwsRuntimeException() throws JsonProcessingException {
        TtsTaskRequest request = new TtsTaskRequest(List.of());
        when(objectMapper.writeValueAsString(request)).thenThrow(new JsonProcessingException("fail") {});

        assertThatThrownBy(() -> ttsClient.createTask(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to serialize");
    }

    @Test
    void getTaskStatus_returnsStatusResponse() {
        TtsTaskStatusResponse expected = new TtsTaskStatusResponse("task-1", "COMPLETED", List.of(), null);
        when(restTemplate.getForObject("http://localhost:8001/tts/tasks/task-1", TtsTaskStatusResponse.class))
                .thenReturn(expected);

        TtsTaskStatusResponse result = ttsClient.getTaskStatus("task-1");

        assertThat(result.status()).isEqualTo("COMPLETED");
        assertThat(result.taskId()).isEqualTo("task-1");
    }

    @Test
    void getTaskContent_returnsContentResponse() {
        TtsResolvedSegment seg = new TtsResolvedSegment(0, "Hello", "p1", "http://audio/0.mp3");
        TtsContentResponse expected = new TtsContentResponse("task-1", "COMPLETED", List.of(seg));
        when(restTemplate.getForObject("http://localhost:8001/tts/tasks/task-1/content", TtsContentResponse.class))
                .thenReturn(expected);

        TtsContentResponse result = ttsClient.getTaskContent("task-1");

        assertThat(result.segments()).hasSize(1);
        assertThat(result.segments().get(0).audioUrl()).isEqualTo("http://audio/0.mp3");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getVoices_returnsVoiceList() {
        List<VoiceDto> voices = List.of(
                new VoiceDto("en-US-JennyNeural", "jenny", "Calm Female", "desc1"),
                new VoiceDto("en-US-GuyNeural", "guy", "Deep Male", "desc2")
        );
        when(restTemplate.exchange(
                eq("http://localhost:8001/voices"),
                eq(HttpMethod.GET),
                isNull(),
                any(ParameterizedTypeReference.class)))
                .thenReturn(ResponseEntity.ok(voices));

        List<VoiceDto> result = ttsClient.getVoices();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo("en-US-JennyNeural");
    }
}

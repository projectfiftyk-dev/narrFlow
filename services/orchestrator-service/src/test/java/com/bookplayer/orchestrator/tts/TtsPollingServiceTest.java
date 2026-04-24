package com.bookplayer.orchestrator.tts;

import com.bookplayer.orchestrator.book.BookService;
import com.bookplayer.orchestrator.book.model.BookSection;
import com.bookplayer.orchestrator.book.model.ContentParagraph;
import com.bookplayer.orchestrator.content.ContentRepository;
import com.bookplayer.orchestrator.content.model.Content;
import com.bookplayer.orchestrator.transformation.TransformationRepository;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import com.bookplayer.orchestrator.tts.model.TtsContentResponse;
import com.bookplayer.orchestrator.tts.model.TtsResolvedSegment;
import com.bookplayer.orchestrator.tts.model.TtsTaskStatusResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TtsPollingServiceTest {

    @Mock TtsClient ttsClient;
    @Mock TransformationRepository transformationRepository;
    @Mock ContentRepository contentRepository;
    @Mock BookService bookService;

    @InjectMocks
    TtsPollingService ttsPollingService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ttsPollingService, "pollIntervalMs", 0L);
        ReflectionTestUtils.setField(ttsPollingService, "maxPollAttempts", 3);
    }

    @Test
    void pollUntilComplete_completedOnFirstPoll_assemblesContentAndSetsDone() {
        Transformation t = Transformation.builder()
                .id("t1").bookId("b1")
                .segmentSectionIds(List.of("s1"))
                .status(TransformationStatus.GENERATING)
                .build();

        TtsTaskStatusResponse statusResponse = new TtsTaskStatusResponse("task-1", "COMPLETED", null, null);
        TtsResolvedSegment seg = new TtsResolvedSegment(0, "Hello world", "p1", "http://tts/audio/0.mp3");
        TtsContentResponse contentResponse = new TtsContentResponse("task-1", "COMPLETED", List.of(seg));
        BookSection section = new BookSection("s1", "Ch1", List.of(new ContentParagraph("Hello world")));

        when(ttsClient.getTaskStatus("task-1")).thenReturn(statusResponse);
        when(ttsClient.getTaskContent("task-1")).thenReturn(contentResponse);
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(section));
        when(contentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ttsPollingService.pollUntilComplete("t1", "task-1");

        ArgumentCaptor<Content> contentCaptor = ArgumentCaptor.forClass(Content.class);
        verify(contentRepository).save(contentCaptor.capture());
        assertThat(contentCaptor.getValue().getItems()).hasSize(1);
        assertThat(contentCaptor.getValue().getItems().get(0).getSectionId()).isEqualTo("s1");
        assertThat(contentCaptor.getValue().getItems().get(0).getAudioUri()).isEqualTo("http://tts/audio/0.mp3");

        ArgumentCaptor<Transformation> tCaptor = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(tCaptor.capture());
        assertThat(tCaptor.getValue().getStatus()).isEqualTo(TransformationStatus.DONE);
    }

    @Test
    void pollUntilComplete_failedStatus_setsTransformationFailed() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.GENERATING).build();
        TtsTaskStatusResponse failedResponse = new TtsTaskStatusResponse("task-1", "FAILED", null, "synthesis error");

        when(ttsClient.getTaskStatus("task-1")).thenReturn(failedResponse);
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ttsPollingService.pollUntilComplete("t1", "task-1");

        ArgumentCaptor<Transformation> captor = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(TransformationStatus.FAILED);
        verify(contentRepository, never()).save(any());
    }

    @Test
    void pollUntilComplete_alwaysPending_timesOutAndSetsFailed() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.GENERATING).build();
        TtsTaskStatusResponse pending = new TtsTaskStatusResponse("task-1", "PENDING", null, null);

        when(ttsClient.getTaskStatus("task-1")).thenReturn(pending);
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ttsPollingService.pollUntilComplete("t1", "task-1");

        // maxPollAttempts = 3, so getTaskStatus called 3 times
        verify(ttsClient, times(3)).getTaskStatus("task-1");

        ArgumentCaptor<Transformation> captor = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(TransformationStatus.FAILED);
    }
}

package com.bookplayer.orchestrator.services.transformation;

import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.domain.book.ContentParagraph;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.repository.TransformationRepository;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.services.tts.TtsClient;
import com.bookplayer.orchestrator.services.tts.TtsPollingService;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import com.bookplayer.orchestrator.transfer.tts.VoiceDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransformationServiceImplTest {

    @Mock TransformationRepository transformationRepository;
    @Mock BookService bookService;
    @Mock TtsClient ttsClient;
    @Mock TtsPollingService ttsPollingService;

    @InjectMocks
    TransformationServiceImpl transformationService;

    @Test
    void createTransformation_belowLimit_createsWithDraftStatus() {
        when(transformationRepository.countByUserId("u1")).thenReturn(2L);
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Transformation result = transformationService.createTransformation("u1",
                new CreateTransformationRequest("b1"));

        assertThat(result.getUserId()).isEqualTo("u1");
        assertThat(result.getBookId()).isEqualTo("b1");
        assertThat(result.getStatus()).isEqualTo(TransformationStatus.DRAFT);
    }

    @Test
    void createTransformation_atMaxLimit_throwsBadRequest() {
        when(transformationRepository.countByUserId("u1")).thenReturn(5L);

        assertThatThrownBy(() -> transformationService.createTransformation("u1",
                new CreateTransformationRequest("b1")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(transformationRepository, never()).save(any());
    }

    @Test
    void createTransformation_bookNotFound_propagatesException() {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"))
                .when(bookService).getBook("bad-book");

        assertThatThrownBy(() -> transformationService.createTransformation("u1",
                new CreateTransformationRequest("bad-book")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Book not found");
    }

    @Test
    void getTransformation_whenFound_returnsIt() {
        Transformation t = Transformation.builder().id("t1").build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThat(transformationService.getTransformation("t1").getId()).isEqualTo("t1");
    }

    @Test
    void getTransformation_whenMissing_throwsNotFound() {
        when(transformationRepository.findById("t99")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transformationService.getTransformation("t99"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listTransformations_returnsAll() {
        List<Transformation> list = List.of(new Transformation(), new Transformation());
        when(transformationRepository.findAll()).thenReturn(list);

        assertThat(transformationService.listTransformations()).hasSize(2);
    }

    @Test
    void updateVoiceMapping_fromDraft_advancesToVoiceAssignment() {
        Transformation t = Transformation.builder().id("t1").userId("u1")
                .status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Transformation result = transformationService.updateVoiceMapping(
                "t1", "u1",
                new UpdateVoiceMappingRequest(Map.of("narrator", "en-US-JennyNeural")));

        assertThat(result.getStatus()).isEqualTo(TransformationStatus.VOICE_ASSIGNMENT);
        assertThat(result.getVoiceMapping()).containsEntry("narrator", "en-US-JennyNeural");
    }

    @Test
    void updateVoiceMapping_whenGenerating_throwsBadRequest() {
        Transformation t = Transformation.builder().id("t1").userId("u1")
                .status(TransformationStatus.GENERATING).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.updateVoiceMapping(
                "t1", "u1",
                new UpdateVoiceMappingRequest(Map.of("narrator", "en-US-JennyNeural"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updateVoiceMapping_byNonOwner_throwsForbidden() {
        Transformation t = Transformation.builder().id("t1").userId("owner")
                .status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.updateVoiceMapping(
                "t1", "intruder",
                new UpdateVoiceMappingRequest(Map.of("narrator", "en-US-JennyNeural"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void triggerGeneration_happyPath_createsOneSegmentPerParagraph() {
        // Section with 2 paragraphs from different authors
        BookSection section = new BookSection("s1", "Chapter 1", List.of(
                new ContentParagraph("It was a dark night.", "narrator"),
                new ContentParagraph("Who goes there?", "villain")
        ));
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.VOICE_ASSIGNMENT)
                .voiceMapping(Map.of(
                        "narrator", "en-US-JennyNeural",
                        "villain", "en-US-GuyNeural"))
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(section));
        when(ttsClient.getVoices()).thenReturn(List.of(
                new VoiceDto("en-US-JennyNeural", "calm_female", "Calm Female", ""),
                new VoiceDto("en-US-GuyNeural", "deep_male", "Deep Male", "")));
        when(ttsClient.createTask(any())).thenReturn("task-abc");
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GenerateResponse response = transformationService.triggerGeneration("t1", "u1");

        assertThat(response.transformationId()).isEqualTo("t1");
        assertThat(response.status()).isEqualTo("GENERATING");
        assertThat(response.ttsTaskId()).isEqualTo("task-abc");

        ArgumentCaptor<Transformation> saved = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(TransformationStatus.GENERATING);
        // 1 section × 2 paragraphs = 2 segments
        assertThat(saved.getValue().getSegmentSectionIds()).containsExactly("s1", "s1");
        assertThat(saved.getValue().getSegmentAuthors()).containsExactly("narrator", "villain");

        verify(ttsPollingService).pollUntilComplete("t1", "task-abc");
    }

    @Test
    void triggerGeneration_multipleSections_createsSegmentsAcrossAllParagraphs() {
        BookSection s1 = new BookSection("s1", "Ch 1", List.of(
                new ContentParagraph("Paragraph one.", "narrator")));
        BookSection s2 = new BookSection("s2", "Ch 2", List.of(
                new ContentParagraph("Paragraph two.", "hero"),
                new ContentParagraph("Paragraph three.", "narrator")));
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.VOICE_ASSIGNMENT)
                .voiceMapping(Map.of(
                        "narrator", "en-US-JennyNeural",
                        "hero", "en-US-AriaNeural"))
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(s1, s2));
        when(ttsClient.getVoices()).thenReturn(List.of(
                new VoiceDto("en-US-JennyNeural", "calm_female", "Calm Female", ""),
                new VoiceDto("en-US-AriaNeural", "expressive_female", "Expressive Female", "")));
        when(ttsClient.createTask(any())).thenReturn("task-xyz");
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        transformationService.triggerGeneration("t1", "u1");

        ArgumentCaptor<Transformation> saved = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(saved.capture());
        // s1×1 + s2×2 = 3 segments
        assertThat(saved.getValue().getSegmentSectionIds()).containsExactly("s1", "s2", "s2");
        assertThat(saved.getValue().getSegmentAuthors()).containsExactly("narrator", "hero", "narrator");
    }

    @Test
    void triggerGeneration_invalidVoiceId_throwsBadRequest() {
        BookSection section = new BookSection("s1", "Ch 1", List.of(
                new ContentParagraph("Hello.", "narrator")));
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.VOICE_ASSIGNMENT)
                .voiceMapping(Map.of("narrator", "invalid-voice"))
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(section));
        when(ttsClient.getVoices()).thenReturn(List.of(
                new VoiceDto("en-US-JennyNeural", "calm_female", "Calm Female", "")));

        assertThatThrownBy(() -> transformationService.triggerGeneration("t1", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void triggerGeneration_wrongStatus_throwsBadRequest() {
        Transformation t = Transformation.builder().id("t1").userId("u1")
                .status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.triggerGeneration("t1", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void triggerGeneration_authorWithoutVoice_throwsBadRequest() {
        BookSection section = new BookSection("s1", "Ch1", List.of(
                new ContentParagraph("Line one.", "narrator"),
                new ContentParagraph("Line two.", "villain"))); // villain has no voice
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.VOICE_ASSIGNMENT)
                .voiceMapping(Map.of("narrator", "en-US-JennyNeural")) // only narrator assigned
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(section));

        assertThatThrownBy(() -> transformationService.triggerGeneration("t1", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}

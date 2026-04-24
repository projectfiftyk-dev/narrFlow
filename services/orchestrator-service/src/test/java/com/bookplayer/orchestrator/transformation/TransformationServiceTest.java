package com.bookplayer.orchestrator.transformation;

import com.bookplayer.orchestrator.book.BookService;
import com.bookplayer.orchestrator.book.model.BookSection;
import com.bookplayer.orchestrator.book.model.ContentParagraph;
import com.bookplayer.orchestrator.persona.PersonaService;
import com.bookplayer.orchestrator.persona.model.Persona;
import com.bookplayer.orchestrator.transformation.dto.CreateTransformationRequest;
import com.bookplayer.orchestrator.transformation.dto.GenerateResponse;
import com.bookplayer.orchestrator.transformation.dto.UpdatePersonaMappingRequest;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import com.bookplayer.orchestrator.tts.TtsClient;
import com.bookplayer.orchestrator.tts.TtsPollingService;
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
class TransformationServiceTest {

    @Mock TransformationRepository transformationRepository;
    @Mock BookService bookService;
    @Mock PersonaService personaService;
    @Mock TtsClient ttsClient;
    @Mock TtsPollingService ttsPollingService;

    @InjectMocks
    TransformationService transformationService;

    @Test
    void createTransformation_belowLimit_createsWithDraftStatus() {
        when(transformationRepository.countByUserId("u1")).thenReturn(2L);
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Transformation result = transformationService.createTransformation("u1", new CreateTransformationRequest("b1"));

        assertThat(result.getUserId()).isEqualTo("u1");
        assertThat(result.getBookId()).isEqualTo("b1");
        assertThat(result.getStatus()).isEqualTo(TransformationStatus.DRAFT);
    }

    @Test
    void createTransformation_atMaxLimit_throwsBadRequest() {
        when(transformationRepository.countByUserId("u1")).thenReturn(5L);

        assertThatThrownBy(() -> transformationService.createTransformation("u1", new CreateTransformationRequest("b1")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(transformationRepository, never()).save(any());
    }

    @Test
    void createTransformation_bookNotFound_propagatesException() {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found"))
                .when(bookService).getBook("bad-book");

        assertThatThrownBy(() -> transformationService.createTransformation("u1", new CreateTransformationRequest("bad-book")))
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
    void listTransformations_returnsUserTransformations() {
        List<Transformation> list = List.of(new Transformation(), new Transformation());
        when(transformationRepository.findByUserId("u1")).thenReturn(list);

        assertThat(transformationService.listTransformations("u1")).hasSize(2);
    }

    @Test
    void updatePersonaMapping_fromDraft_advancesToPersonaAssignment() {
        Transformation t = Transformation.builder().id("t1").userId("u1").status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Transformation result = transformationService.updatePersonaMapping(
                "t1", "u1", new UpdatePersonaMappingRequest(Map.of("s1", "p1")));

        assertThat(result.getStatus()).isEqualTo(TransformationStatus.PERSONA_ASSIGNMENT);
        assertThat(result.getPersonaMapping()).containsEntry("s1", "p1");
    }

    @Test
    void updatePersonaMapping_whenGenerating_throwsBadRequest() {
        Transformation t = Transformation.builder().id("t1").userId("u1").status(TransformationStatus.GENERATING).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.updatePersonaMapping(
                "t1", "u1", new UpdatePersonaMappingRequest(Map.of("s1", "p1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void updatePersonaMapping_byNonOwner_throwsForbidden() {
        Transformation t = Transformation.builder().id("t1").userId("owner").status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.updatePersonaMapping(
                "t1", "intruder", new UpdatePersonaMappingRequest(Map.of("s1", "p1"))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void triggerGeneration_happyPath_submitsTaskAndStartsPolling() {
        BookSection section = new BookSection("s1", "Ch 1", List.of(new ContentParagraph("Hello world")));
        Persona persona = Persona.builder().id("p1").voiceId("en-US-JennyNeural").build();
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.PERSONA_ASSIGNMENT)
                .personaMapping(Map.of("s1", "p1"))
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(section));
        when(personaService.getPersona("p1")).thenReturn(persona);
        when(ttsClient.createTask(any())).thenReturn("task-abc");
        when(transformationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GenerateResponse response = transformationService.triggerGeneration("t1", "u1");

        assertThat(response.transformationId()).isEqualTo("t1");
        assertThat(response.status()).isEqualTo("GENERATING");
        assertThat(response.ttsTaskId()).isEqualTo("task-abc");

        ArgumentCaptor<Transformation> saved = ArgumentCaptor.forClass(Transformation.class);
        verify(transformationRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(TransformationStatus.GENERATING);
        assertThat(saved.getValue().getSegmentSectionIds()).containsExactly("s1");

        verify(ttsPollingService).pollUntilComplete("t1", "task-abc");
    }

    @Test
    void triggerGeneration_wrongStatus_throwsBadRequest() {
        Transformation t = Transformation.builder().id("t1").userId("u1").status(TransformationStatus.DRAFT).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> transformationService.triggerGeneration("t1", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void triggerGeneration_sectionWithoutPersona_throwsBadRequest() {
        BookSection s1 = new BookSection("s1", "Ch1", List.of());
        BookSection s2 = new BookSection("s2", "Ch2", List.of());
        Transformation t = Transformation.builder()
                .id("t1").userId("u1").bookId("b1")
                .status(TransformationStatus.PERSONA_ASSIGNMENT)
                .personaMapping(Map.of("s1", "p1")) // s2 not assigned
                .build();

        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(bookService.getSections("b1")).thenReturn(List.of(s1, s2));

        assertThatThrownBy(() -> transformationService.triggerGeneration("t1", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}

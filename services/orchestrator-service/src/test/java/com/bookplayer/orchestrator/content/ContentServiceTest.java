package com.bookplayer.orchestrator.content;

import com.bookplayer.orchestrator.content.model.Content;
import com.bookplayer.orchestrator.transformation.TransformationRepository;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    ContentRepository contentRepository;

    @Mock
    TransformationRepository transformationRepository;

    @InjectMocks
    ContentService contentService;

    @Test
    void getContent_whenDone_returnsContent() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.DONE).build();
        Content c = Content.builder().id("c1").transformationId("t1").items(List.of()).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(contentRepository.findByTransformationId("t1")).thenReturn(Optional.of(c));

        Content result = contentService.getContent("t1");

        assertThat(result.getId()).isEqualTo("c1");
    }

    @Test
    void getContent_whenNotDone_throwsConflict() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.GENERATING).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));

        assertThatThrownBy(() -> contentService.getContent("t1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void getContent_transformationNotFound_throwsNotFound() {
        when(transformationRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contentService.getContent("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getContent_contentMissing_throwsNotFound() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.DONE).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(contentRepository.findByTransformationId("t1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contentService.getContent("t1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}

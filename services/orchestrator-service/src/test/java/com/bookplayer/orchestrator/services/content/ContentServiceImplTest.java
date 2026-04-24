package com.bookplayer.orchestrator.services.content;

import com.bookplayer.orchestrator.domain.content.Content;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.repository.ContentRepository;
import com.bookplayer.orchestrator.repository.TransformationRepository;
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
class ContentServiceImplTest {

    @Mock ContentRepository contentRepository;
    @Mock TransformationRepository transformationRepository;

    @InjectMocks
    ContentServiceImpl contentService;

    @Test
    void getContent_whenDone_returnsContent() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.DONE).build();
        Content content = Content.builder().id("c1").transformationId("t1").items(List.of()).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(contentRepository.findByTransformationId("t1")).thenReturn(Optional.of(content));

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
    void getContent_whenTransformationMissing_throwsNotFound() {
        when(transformationRepository.findById("t99")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contentService.getContent("t99"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getContent_whenContentMissing_throwsNotFound() {
        Transformation t = Transformation.builder().id("t1").status(TransformationStatus.DONE).build();
        when(transformationRepository.findById("t1")).thenReturn(Optional.of(t));
        when(contentRepository.findByTransformationId("t1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contentService.getContent("t1"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}

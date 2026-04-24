package com.bookplayer.orchestrator.content;

import com.bookplayer.orchestrator.content.model.Content;
import com.bookplayer.orchestrator.transformation.TransformationRepository;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ContentService {

    private final ContentRepository contentRepository;
    private final TransformationRepository transformationRepository;

    public Content getContent(String transformationId) {
        Transformation transformation = transformationRepository.findById(transformationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Transformation not found: " + transformationId));

        if (transformation.getStatus() != TransformationStatus.DONE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Content not ready. Transformation status: " + transformation.getStatus());
        }

        return contentRepository.findByTransformationId(transformationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Content not found for transformation: " + transformationId));
    }
}

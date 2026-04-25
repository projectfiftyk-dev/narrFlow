package com.bookplayer.orchestrator.services.content;

import com.bookplayer.orchestrator.domain.content.Content;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.domain.transformation.TransformationVisibility;
import com.bookplayer.orchestrator.repository.ContentRepository;
import com.bookplayer.orchestrator.repository.TransformationRepository;
import com.bookplayer.orchestrator.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;
    private final TransformationRepository transformationRepository;

    @Override
    public Content getContent(String transformationId, AuthenticatedUser user) {
        log.debug("Fetching content for transformation: {}", transformationId);
        Transformation transformation = transformationRepository.findById(transformationId)
                .orElseThrow(() -> {
                    log.warn("Transformation not found: {}", transformationId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Transformation not found: " + transformationId);
                });

        boolean isPublic = transformation.getVisibility() == TransformationVisibility.PUBLIC;
        boolean isOwnerOrAdmin = user != null && (user.isAdmin() || transformation.getUserId().equals(user.userId()));
        if (!isPublic && !isOwnerOrAdmin) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Transformation not found: " + transformationId);
        }

        if (transformation.getStatus() != TransformationStatus.DONE) {
            log.warn("Content not ready for transformation {}: status={}", transformationId, transformation.getStatus());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Content not ready. Transformation status: " + transformation.getStatus());
        }

        return contentRepository.findByTransformationId(transformationId)
                .orElseThrow(() -> {
                    log.error("Content missing for completed transformation: {}", transformationId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Content not found for transformation: " + transformationId);
                });
    }
}

package com.bookplayer.orchestrator.services.transformation;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.security.AuthenticatedUser;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVisibilityRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import org.springframework.data.domain.Pageable;

public interface TransformationService {
    Transformation createTransformation(AuthenticatedUser user, CreateTransformationRequest request);
    Transformation getTransformation(String transformationId, AuthenticatedUser user);
    PagedResponse<Transformation> listTransformations(AuthenticatedUser user, String search, Pageable pageable);
    Transformation updateVoiceMapping(String transformationId, AuthenticatedUser user, UpdateVoiceMappingRequest request);
    Transformation updateVisibility(String transformationId, AuthenticatedUser user, UpdateVisibilityRequest request);
    GenerateResponse triggerGeneration(String transformationId, AuthenticatedUser user);
    void deleteTransformation(String transformationId, AuthenticatedUser user);
}

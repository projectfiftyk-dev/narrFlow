package com.bookplayer.orchestrator.services.transformation;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;

import java.util.List;

public interface TransformationService {
    Transformation createTransformation(String userId, CreateTransformationRequest request);
    Transformation getTransformation(String transformationId);
    List<Transformation> listTransformations();
    Transformation updateVoiceMapping(String transformationId, String userId, UpdateVoiceMappingRequest request);
    GenerateResponse triggerGeneration(String transformationId, String userId);
}

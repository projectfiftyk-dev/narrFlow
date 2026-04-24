package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.services.transformation.TransformationService;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/transformations")
@RequiredArgsConstructor
public class TransformationController {

    private final TransformationService transformationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transformation createTransformation(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @Valid @RequestBody CreateTransformationRequest request) {
        log.info("POST /transformations user={} bookId={}", userId, request.bookId());
        return transformationService.createTransformation(userId, request);
    }

    @GetMapping
    public List<Transformation> listTransformations() {
        log.debug("GET /transformations");
        return transformationService.listTransformations();
    }

    @GetMapping("/{transformationId}")
    public Transformation getTransformation(@PathVariable String transformationId) {
        log.debug("GET /transformations/{}", transformationId);
        return transformationService.getTransformation(transformationId);
    }

    @PutMapping("/{transformationId}/voices")
    public Transformation updateVoiceMapping(
            @PathVariable String transformationId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @Valid @RequestBody UpdateVoiceMappingRequest request) {
        log.info("PUT /transformations/{}/voices user={}", transformationId, userId);
        return transformationService.updateVoiceMapping(transformationId, userId, request);
    }

    @PostMapping("/{transformationId}/generate")
    public GenerateResponse triggerGeneration(
            @PathVariable String transformationId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        log.info("POST /transformations/{}/generate user={}", transformationId, userId);
        return transformationService.triggerGeneration(transformationId, userId);
    }
}

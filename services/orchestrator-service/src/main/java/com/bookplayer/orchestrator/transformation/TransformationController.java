package com.bookplayer.orchestrator.transformation;

import com.bookplayer.orchestrator.transformation.dto.CreateTransformationRequest;
import com.bookplayer.orchestrator.transformation.dto.GenerateResponse;
import com.bookplayer.orchestrator.transformation.dto.UpdatePersonaMappingRequest;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return transformationService.createTransformation(userId, request);
    }

    @GetMapping
    public List<Transformation> listTransformations(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        return transformationService.listTransformations(userId);
    }

    @GetMapping("/{transformationId}")
    public Transformation getTransformation(@PathVariable String transformationId) {
        return transformationService.getTransformation(transformationId);
    }

    @PutMapping("/{transformationId}/personas")
    public Transformation updatePersonaMapping(
            @PathVariable String transformationId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @Valid @RequestBody UpdatePersonaMappingRequest request) {
        return transformationService.updatePersonaMapping(transformationId, userId, request);
    }

    @PostMapping("/{transformationId}/generate")
    public GenerateResponse triggerGeneration(
            @PathVariable String transformationId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        return transformationService.triggerGeneration(transformationId, userId);
    }
}

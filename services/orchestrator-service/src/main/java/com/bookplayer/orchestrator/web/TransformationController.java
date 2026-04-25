package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.security.AuthenticatedUser;
import com.bookplayer.orchestrator.security.SecurityUtils;
import com.bookplayer.orchestrator.services.transformation.TransformationService;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVisibilityRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/v1/transformations")
@RequiredArgsConstructor
public class TransformationController {

    private static final Set<String> TRANSFORMATION_SORT_FIELDS = Set.of("createdAt", "updatedAt", "name");

    private final TransformationService transformationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transformation createTransformation(@Valid @RequestBody CreateTransformationRequest request) {
        SecurityUtils.requireAuthenticated();
        AuthenticatedUser user = SecurityUtils.currentUser();
        log.info("POST /transformations user={} bookId={}", user.userId(), request.bookId());
        return transformationService.createTransformation(user, request);
    }

    @GetMapping
    public PagedResponse<Transformation> listTransformations(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthenticatedUser user = SecurityUtils.currentUser();
        String field = TRANSFORMATION_SORT_FIELDS.contains(sortBy) ? sortBy : "updatedAt";
        Sort sort = Sort.by(Sort.Direction.fromOptionalString(sortDir).orElse(Sort.Direction.DESC), field);
        log.debug("GET /transformations user={} search='{}' sortBy={} page={} size={}",
                user != null ? user.userId() : "anonymous", search, field, page, size);
        return transformationService.listTransformations(user, search, PageRequest.of(page, size, sort));
    }

    @GetMapping("/{transformationId}")
    public Transformation getTransformation(@PathVariable String transformationId) {
        AuthenticatedUser user = SecurityUtils.currentUser();
        log.debug("GET /transformations/{} user={}", transformationId, user != null ? user.userId() : "anonymous");
        return transformationService.getTransformation(transformationId, user);
    }

    @PutMapping("/{transformationId}/voices")
    public Transformation updateVoiceMapping(
            @PathVariable String transformationId,
            @Valid @RequestBody UpdateVoiceMappingRequest request) {
        SecurityUtils.requireAuthenticated();
        AuthenticatedUser user = SecurityUtils.currentUser();
        log.info("PUT /transformations/{}/voices user={}", transformationId, user.userId());
        return transformationService.updateVoiceMapping(transformationId, user, request);
    }

    @PatchMapping("/{transformationId}/visibility")
    public Transformation updateVisibility(
            @PathVariable String transformationId,
            @Valid @RequestBody UpdateVisibilityRequest request) {
        SecurityUtils.requireAuthenticated();
        AuthenticatedUser user = SecurityUtils.currentUser();
        log.info("PATCH /transformations/{}/visibility user={} visibility={}", transformationId, user.userId(), request.visibility());
        return transformationService.updateVisibility(transformationId, user, request);
    }

    @PostMapping("/{transformationId}/generate")
    public GenerateResponse triggerGeneration(@PathVariable String transformationId) {
        SecurityUtils.requireAuthenticated();
        AuthenticatedUser user = SecurityUtils.currentUser();
        log.info("POST /transformations/{}/generate user={}", transformationId, user.userId());
        return transformationService.triggerGeneration(transformationId, user);
    }
}

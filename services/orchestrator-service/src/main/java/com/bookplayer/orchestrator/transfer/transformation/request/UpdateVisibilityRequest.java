package com.bookplayer.orchestrator.transfer.transformation.request;

import com.bookplayer.orchestrator.domain.transformation.TransformationVisibility;
import jakarta.validation.constraints.NotNull;

public record UpdateVisibilityRequest(
        @NotNull TransformationVisibility visibility
) {}

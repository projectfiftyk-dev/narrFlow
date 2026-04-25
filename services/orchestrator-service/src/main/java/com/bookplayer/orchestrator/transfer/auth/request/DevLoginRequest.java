package com.bookplayer.orchestrator.transfer.auth.request;

import com.bookplayer.orchestrator.domain.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DevLoginRequest(
        @NotBlank @Email String email,
        @NotNull Role role
) {}

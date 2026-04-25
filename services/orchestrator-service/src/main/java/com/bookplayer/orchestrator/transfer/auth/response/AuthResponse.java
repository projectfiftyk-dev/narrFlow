package com.bookplayer.orchestrator.transfer.auth.response;

import com.bookplayer.orchestrator.domain.user.Role;

public record AuthResponse(
        String token,
        String userId,
        String email,
        String firstName,
        String lastName,
        Role role
) {}

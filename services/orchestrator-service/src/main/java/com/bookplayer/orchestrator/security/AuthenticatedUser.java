package com.bookplayer.orchestrator.security;

import com.bookplayer.orchestrator.domain.user.Role;

public record AuthenticatedUser(String userId, String email, Role role) {
    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}

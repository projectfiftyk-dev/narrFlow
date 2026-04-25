package com.bookplayer.orchestrator.security;

public final class SecurityContext {

    private static final ThreadLocal<AuthenticatedUser> HOLDER = new ThreadLocal<>();

    private SecurityContext() {}

    static void set(AuthenticatedUser user) {
        HOLDER.set(user);
    }

    static AuthenticatedUser get() {
        return HOLDER.get();
    }

    static void clear() {
        HOLDER.remove();
    }
}

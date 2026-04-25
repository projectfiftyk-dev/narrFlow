package com.bookplayer.orchestrator.services.auth;

import com.bookplayer.orchestrator.transfer.auth.request.LoginRequest;
import com.bookplayer.orchestrator.transfer.auth.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
}

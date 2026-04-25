package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.services.auth.AuthService;
import com.bookplayer.orchestrator.transfer.auth.request.LoginRequest;
import com.bookplayer.orchestrator.transfer.auth.response.AuthResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        log.info("POST /auth/login");
        return authService.login(request);
    }
}

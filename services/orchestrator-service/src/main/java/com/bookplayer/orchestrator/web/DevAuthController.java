package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.user.User;
import com.bookplayer.orchestrator.repository.UserRepository;
import com.bookplayer.orchestrator.security.JwtService;
import com.bookplayer.orchestrator.transfer.auth.request.DevLoginRequest;
import com.bookplayer.orchestrator.transfer.auth.response.AuthResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Profile("dev")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class DevAuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @PostMapping("/dev-login")
    public AuthResponse devLogin(@Valid @RequestBody DevLoginRequest request) {
        log.warn("DEV-ONLY login used for email={} role={}", request.email(), request.role());

        User user = userRepository.findByEmail(request.email())
                .map(existing -> {
                    existing.setRole(request.role());
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .accountId("dev-" + UUID.randomUUID())
                        .email(request.email())
                        .firstName("Dev")
                        .lastName("User")
                        .role(request.role())
                        .createdAt(LocalDateTime.now())
                        .build()));

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(), user.getRole());
    }
}

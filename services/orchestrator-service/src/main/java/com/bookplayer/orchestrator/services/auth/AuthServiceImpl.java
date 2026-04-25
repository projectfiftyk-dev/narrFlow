package com.bookplayer.orchestrator.services.auth;

import com.bookplayer.orchestrator.config.AuthProperties;
import com.bookplayer.orchestrator.domain.user.Role;
import com.bookplayer.orchestrator.domain.user.User;
import com.bookplayer.orchestrator.repository.UserRepository;
import com.bookplayer.orchestrator.security.GoogleTokenVerifier;
import com.bookplayer.orchestrator.security.GoogleTokenVerifier.GooglePayload;
import com.bookplayer.orchestrator.security.JwtService;
import com.bookplayer.orchestrator.transfer.auth.request.LoginRequest;
import com.bookplayer.orchestrator.transfer.auth.response.AuthResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthProperties authProperties;

    @Override
    public AuthResponse login(LoginRequest request) {
        GooglePayload payload = googleTokenVerifier.verify(request.googleToken());

        User user = userRepository.findByAccountId(payload.sub())
                .orElseGet(() -> createUser(payload));

        if (payload.firstName() != null && !payload.firstName().equals(user.getFirstName())
                || payload.lastName() != null && !payload.lastName().equals(user.getLastName())) {
            user.setFirstName(payload.firstName());
            user.setLastName(payload.lastName());
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        log.info("User logged in: id={}, email={}, role={}", user.getId(), user.getEmail(), user.getRole());

        return new AuthResponse(token, user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(), user.getRole());
    }

    private User createUser(GooglePayload payload) {
        Role role = authProperties.getAdminEmails().contains(payload.email()) ? Role.ADMIN : Role.USER;
        User user = User.builder()
                .accountId(payload.sub())
                .email(payload.email())
                .firstName(payload.firstName())
                .lastName(payload.lastName())
                .role(role)
                .createdAt(LocalDateTime.now())
                .build();
        User saved = userRepository.save(user);
        log.info("New user registered: id={}, email={}, role={}", saved.getId(), payload.email(), role);
        return saved;
    }
}

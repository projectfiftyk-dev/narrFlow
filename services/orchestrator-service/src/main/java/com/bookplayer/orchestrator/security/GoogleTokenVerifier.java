package com.bookplayer.orchestrator.security;

import com.bookplayer.orchestrator.config.AuthProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL =
            "https://oauth2.googleapis.com/tokeninfo?id_token={token}";

    private final RestTemplate restTemplate;
    private final AuthProperties authProperties;

    /**
     * Verifies the Google ID token via Google's tokeninfo endpoint and returns
     * a payload containing: sub, email, given_name, family_name.
     */
    public GooglePayload verify(String idToken) {
        Map<?, ?> response;
        try {
            response = restTemplate.getForObject(TOKENINFO_URL, Map.class, idToken);
        } catch (RestClientException e) {
            log.warn("Google token verification failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }

        String aud = (String) response.get("aud");
        String clientId = authProperties.getGoogle().getClientId();
        if (!clientId.equals(aud)) {
            log.warn("Google token audience mismatch: expected={} got={}", clientId, aud);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token audience mismatch");
        }

        String expStr = (String) response.get("exp");
        if (expStr == null || Long.parseLong(expStr) < System.currentTimeMillis() / 1000) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token expired");
        }

        return new GooglePayload(
                (String) response.get("sub"),
                (String) response.get("email"),
                (String) response.get("given_name"),
                (String) response.get("family_name")
        );
    }

    public record GooglePayload(String sub, String email, String firstName, String lastName) {}
}

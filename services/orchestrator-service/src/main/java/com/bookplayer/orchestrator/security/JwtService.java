package com.bookplayer.orchestrator.security;

import com.bookplayer.orchestrator.config.AuthProperties;
import com.bookplayer.orchestrator.domain.user.Role;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String HEADER = base64UrlEncode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final AuthProperties authProperties;
    private final ObjectMapper objectMapper;

    public String generateToken(String userId, String email, Role role) {
        try {
            long nowSec = System.currentTimeMillis() / 1000;
            long expSec = nowSec + authProperties.getJwt().getExpirationMs() / 1000;

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", userId);
            payload.put("email", email);
            payload.put("role", role.name());
            payload.put("iat", nowSec);
            payload.put("exp", expSec);

            String payloadEncoded = base64UrlEncode(objectMapper.writeValueAsBytes(payload));
            String signingInput = HEADER + "." + payloadEncoded;
            String signature = base64UrlEncode(sign(signingInput));

            return signingInput + "." + signature;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate JWT", e);
        }
    }

    public AuthenticatedUser validateAndExtract(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String signingInput = parts[0] + "." + parts[1];
            byte[] expectedSig = sign(signingInput);
            byte[] actualSig = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSig, actualSig)) return null;

            Map<String, Object> payload = objectMapper.readValue(
                    Base64.getUrlDecoder().decode(parts[1]), MAP_TYPE);

            long exp = ((Number) payload.get("exp")).longValue();
            if (System.currentTimeMillis() / 1000 > exp) {
                log.debug("JWT expired");
                return null;
            }

            String userId = (String) payload.get("sub");
            String email = (String) payload.get("email");
            Role role = Role.valueOf((String) payload.get("role"));

            return new AuthenticatedUser(userId, email, role);
        } catch (Exception e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return null;
        }
    }

    private byte[] sign(String input) throws Exception {
        byte[] keyBytes = authProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(keyBytes, "HmacSHA256"));
        return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
    }

    private static String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}

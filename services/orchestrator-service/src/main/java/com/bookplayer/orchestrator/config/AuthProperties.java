package com.bookplayer.orchestrator.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "auth")
public class AuthProperties {

    private Google google = new Google();
    private Jwt jwt = new Jwt();
    private List<String> adminEmails = List.of();

    @Data
    public static class Google {
        private String clientId;
    }

    @Data
    public static class Jwt {
        private String secret;
        private long expirationMs;
    }
}

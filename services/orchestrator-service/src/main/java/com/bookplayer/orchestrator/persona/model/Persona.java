package com.bookplayer.orchestrator.persona.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "personas")
public class Persona {
    @Id
    private String id;
    private String userId;
    private String bookId;
    private String name;
    private String voiceId;
}

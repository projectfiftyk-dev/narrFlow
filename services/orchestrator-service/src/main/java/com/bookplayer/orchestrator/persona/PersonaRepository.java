package com.bookplayer.orchestrator.persona;

import com.bookplayer.orchestrator.persona.model.Persona;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PersonaRepository extends MongoRepository<Persona, String> {
    List<Persona> findByUserIdAndBookId(String userId, String bookId);
    List<Persona> findByUserId(String userId);
}

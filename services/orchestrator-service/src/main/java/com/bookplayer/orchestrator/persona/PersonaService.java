package com.bookplayer.orchestrator.persona;

import com.bookplayer.orchestrator.persona.dto.CreatePersonaRequest;
import com.bookplayer.orchestrator.persona.dto.UpdatePersonaRequest;
import com.bookplayer.orchestrator.persona.model.Persona;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonaService {

    private final PersonaRepository personaRepository;

    public Persona createPersona(String userId, CreatePersonaRequest request) {
        Persona persona = Persona.builder()
                .userId(userId)
                .bookId(request.bookId())
                .name(request.name())
                .voiceId(request.voiceId())
                .build();
        return personaRepository.save(persona);
    }

    public List<Persona> listPersonas(String userId, String bookId) {
        if (bookId != null) {
            return personaRepository.findByUserIdAndBookId(userId, bookId);
        }
        return personaRepository.findByUserId(userId);
    }

    public Persona getPersona(String personaId) {
        return personaRepository.findById(personaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Persona not found: " + personaId));
    }

    public Persona updatePersona(String personaId, String userId, UpdatePersonaRequest request) {
        Persona persona = getPersona(personaId);
        if (!persona.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to update this persona");
        }
        if (request.name() != null) persona.setName(request.name());
        if (request.voiceId() != null) persona.setVoiceId(request.voiceId());
        return personaRepository.save(persona);
    }

    public void deletePersona(String personaId, String userId) {
        Persona persona = getPersona(personaId);
        if (!persona.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this persona");
        }
        personaRepository.deleteById(personaId);
    }
}

package com.bookplayer.orchestrator.persona;

import com.bookplayer.orchestrator.persona.dto.CreatePersonaRequest;
import com.bookplayer.orchestrator.persona.dto.UpdatePersonaRequest;
import com.bookplayer.orchestrator.persona.model.Persona;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/personas")
@RequiredArgsConstructor
public class PersonaController {

    private final PersonaService personaService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Persona createPersona(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @Valid @RequestBody CreatePersonaRequest request) {
        return personaService.createPersona(userId, request);
    }

    @GetMapping
    public List<Persona> listPersonas(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestParam(required = false) String bookId) {
        return personaService.listPersonas(userId, bookId);
    }

    @GetMapping("/{personaId}")
    public Persona getPersona(@PathVariable String personaId) {
        return personaService.getPersona(personaId);
    }

    @PutMapping("/{personaId}")
    public Persona updatePersona(
            @PathVariable String personaId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestBody UpdatePersonaRequest request) {
        return personaService.updatePersona(personaId, userId, request);
    }

    @DeleteMapping("/{personaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePersona(
            @PathVariable String personaId,
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        personaService.deletePersona(personaId, userId);
    }
}

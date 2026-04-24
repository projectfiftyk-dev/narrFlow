package com.bookplayer.orchestrator.persona;

import com.bookplayer.orchestrator.persona.dto.CreatePersonaRequest;
import com.bookplayer.orchestrator.persona.dto.UpdatePersonaRequest;
import com.bookplayer.orchestrator.persona.model.Persona;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonaServiceTest {

    @Mock
    PersonaRepository personaRepository;

    @InjectMocks
    PersonaService personaService;

    @Test
    void createPersona_savesWithCorrectUserId() {
        CreatePersonaRequest req = new CreatePersonaRequest("b1", "Narrator", "voice-01");
        when(personaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Persona result = personaService.createPersona("user-42", req);

        assertThat(result.getUserId()).isEqualTo("user-42");
        assertThat(result.getBookId()).isEqualTo("b1");
        assertThat(result.getName()).isEqualTo("Narrator");
        assertThat(result.getVoiceId()).isEqualTo("voice-01");
    }

    @Test
    void listPersonas_withBookId_callsFilteredQuery() {
        when(personaRepository.findByUserIdAndBookId("u1", "b1")).thenReturn(List.of(new Persona()));

        List<Persona> result = personaService.listPersonas("u1", "b1");

        assertThat(result).hasSize(1);
        verify(personaRepository).findByUserIdAndBookId("u1", "b1");
        verify(personaRepository, never()).findByUserId(any());
    }

    @Test
    void listPersonas_withoutBookId_callsUserQuery() {
        when(personaRepository.findByUserId("u1")).thenReturn(List.of(new Persona(), new Persona()));

        List<Persona> result = personaService.listPersonas("u1", null);

        assertThat(result).hasSize(2);
        verify(personaRepository).findByUserId("u1");
        verify(personaRepository, never()).findByUserIdAndBookId(any(), any());
    }

    @Test
    void getPersona_whenFound_returnsPersona() {
        Persona p = Persona.builder().id("p1").name("Wizard").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));

        assertThat(personaService.getPersona("p1").getName()).isEqualTo("Wizard");
    }

    @Test
    void getPersona_whenNotFound_throwsNotFound() {
        when(personaRepository.findById("p99")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personaService.getPersona("p99"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Persona not found");
    }

    @Test
    void updatePersona_byOwner_updatesNameAndVoice() {
        Persona p = Persona.builder().id("p1").userId("u1").name("Old").voiceId("v1").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));
        when(personaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Persona result = personaService.updatePersona("p1", "u1", new UpdatePersonaRequest("New", "v2"));

        assertThat(result.getName()).isEqualTo("New");
        assertThat(result.getVoiceId()).isEqualTo("v2");
    }

    @Test
    void updatePersona_nullFields_keepsExistingValues() {
        Persona p = Persona.builder().id("p1").userId("u1").name("Keep").voiceId("v-keep").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));
        when(personaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Persona result = personaService.updatePersona("p1", "u1", new UpdatePersonaRequest(null, null));

        assertThat(result.getName()).isEqualTo("Keep");
        assertThat(result.getVoiceId()).isEqualTo("v-keep");
    }

    @Test
    void updatePersona_byNonOwner_throwsForbidden() {
        Persona p = Persona.builder().id("p1").userId("owner").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> personaService.updatePersona("p1", "intruder", new UpdatePersonaRequest("x", "y")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void deletePersona_byOwner_deletesById() {
        Persona p = Persona.builder().id("p1").userId("u1").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));

        personaService.deletePersona("p1", "u1");

        verify(personaRepository).deleteById("p1");
    }

    @Test
    void deletePersona_byNonOwner_throwsForbidden() {
        Persona p = Persona.builder().id("p1").userId("owner").build();
        when(personaRepository.findById("p1")).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> personaService.deletePersona("p1", "intruder"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(personaRepository, never()).deleteById(any());
    }
}

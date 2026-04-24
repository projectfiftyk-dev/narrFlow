package com.bookplayer.orchestrator.transformation;

import com.bookplayer.orchestrator.book.BookService;
import com.bookplayer.orchestrator.book.model.BookSection;
import com.bookplayer.orchestrator.persona.PersonaService;
import com.bookplayer.orchestrator.persona.model.Persona;
import com.bookplayer.orchestrator.transformation.dto.CreateTransformationRequest;
import com.bookplayer.orchestrator.transformation.dto.GenerateResponse;
import com.bookplayer.orchestrator.transformation.dto.UpdatePersonaMappingRequest;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import com.bookplayer.orchestrator.tts.TtsClient;
import com.bookplayer.orchestrator.tts.TtsPollingService;
import com.bookplayer.orchestrator.tts.model.TtsSegmentInput;
import com.bookplayer.orchestrator.tts.model.TtsTaskRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransformationService {

    private static final int MAX_TRANSFORMATIONS_PER_USER = 5;

    private final TransformationRepository transformationRepository;
    private final BookService bookService;
    private final PersonaService personaService;
    private final TtsClient ttsClient;
    private final TtsPollingService ttsPollingService;

    public Transformation createTransformation(String userId, CreateTransformationRequest request) {
        bookService.getBook(request.bookId()); // verify book exists

        long count = transformationRepository.countByUserId(userId);
        if (count >= MAX_TRANSFORMATIONS_PER_USER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Maximum of " + MAX_TRANSFORMATIONS_PER_USER + " transformations per user reached");
        }

        Transformation transformation = Transformation.builder()
                .userId(userId)
                .bookId(request.bookId())
                .status(TransformationStatus.DRAFT)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return transformationRepository.save(transformation);
    }

    public Transformation getTransformation(String transformationId) {
        return transformationRepository.findById(transformationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Transformation not found: " + transformationId));
    }

    public List<Transformation> listTransformations(String userId) {
        return transformationRepository.findByUserId(userId);
    }

    public Transformation updatePersonaMapping(String transformationId, String userId,
                                               UpdatePersonaMappingRequest request) {
        Transformation transformation = getTransformation(transformationId);
        assertOwner(transformation, userId);

        if (transformation.getStatus() == TransformationStatus.GENERATING
                || transformation.getStatus() == TransformationStatus.DONE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot update persona mapping when transformation is in status: " + transformation.getStatus());
        }

        transformation.setPersonaMapping(request.personaMapping());
        transformation.setStatus(TransformationStatus.PERSONA_ASSIGNMENT);
        transformation.setUpdatedAt(LocalDateTime.now());
        return transformationRepository.save(transformation);
    }

    public GenerateResponse triggerGeneration(String transformationId, String userId) {
        Transformation transformation = getTransformation(transformationId);
        assertOwner(transformation, userId);

        if (transformation.getStatus() != TransformationStatus.PERSONA_ASSIGNMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Transformation must be in PERSONA_ASSIGNMENT status. Current: " + transformation.getStatus());
        }

        List<BookSection> sections = bookService.getSections(transformation.getBookId());
        Map<String, String> personaMapping = transformation.getPersonaMapping();

        List<String> unassigned = sections.stream()
                .map(BookSection::getSectionId)
                .filter(id -> !personaMapping.containsKey(id))
                .collect(Collectors.toList());
        if (!unassigned.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Sections without persona assignment: " + unassigned);
        }

        List<TtsSegmentInput> segments = new ArrayList<>();
        List<String> segmentSectionIds = new ArrayList<>();

        for (int i = 0; i < sections.size(); i++) {
            BookSection section = sections.get(i);
            String personaId = personaMapping.get(section.getSectionId());
            Persona persona = personaService.getPersona(personaId);

            String text = section.getContent().stream()
                    .map(p -> p.getText())
                    .collect(Collectors.joining(" "));

            segments.add(TtsSegmentInput.builder()
                    .segmentNumber(i)
                    .text(text)
                    .voiceId(persona.getVoiceId())
                    .personaId(personaId)
                    .transformationId(transformationId)
                    .build());

            segmentSectionIds.add(section.getSectionId());
        }

        String ttsTaskId = ttsClient.createTask(new TtsTaskRequest(segments));

        transformation.setTtsTaskId(ttsTaskId);
        transformation.setSegmentSectionIds(segmentSectionIds);
        transformation.setStatus(TransformationStatus.GENERATING);
        transformation.setUpdatedAt(LocalDateTime.now());
        transformationRepository.save(transformation);

        ttsPollingService.pollUntilComplete(transformationId, ttsTaskId);

        return new GenerateResponse(transformationId, TransformationStatus.GENERATING.name(), ttsTaskId);
    }

    private void assertOwner(Transformation transformation, String userId) {
        if (!transformation.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Not authorized to modify this transformation");
        }
    }
}

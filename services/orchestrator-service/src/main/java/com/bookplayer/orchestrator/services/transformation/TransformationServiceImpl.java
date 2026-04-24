package com.bookplayer.orchestrator.services.transformation;

import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.domain.book.ContentParagraph;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.repository.TransformationRepository;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.services.tts.TtsClient;
import com.bookplayer.orchestrator.services.tts.TtsPollingService;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import com.bookplayer.orchestrator.transfer.tts.TtsSegmentInput;
import com.bookplayer.orchestrator.transfer.tts.TtsTaskRequest;
import com.bookplayer.orchestrator.transfer.tts.VoiceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransformationServiceImpl implements TransformationService {

    private static final int MAX_TRANSFORMATIONS_PER_USER = 5;

    private final TransformationRepository transformationRepository;
    private final BookService bookService;
    private final TtsClient ttsClient;
    private final TtsPollingService ttsPollingService;

    @Override
    public Transformation createTransformation(String userId, CreateTransformationRequest request) {
        log.info("Creating transformation for user={}, bookId={}", userId, request.bookId());
        bookService.getBook(request.bookId());

        long count = transformationRepository.countByUserId(userId);
        if (count >= MAX_TRANSFORMATIONS_PER_USER) {
            log.warn("User {} reached transformation limit ({})", userId, MAX_TRANSFORMATIONS_PER_USER);
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
        Transformation saved = transformationRepository.save(transformation);
        log.info("Transformation created: id={}", saved.getId());
        return saved;
    }

    @Override
    public Transformation getTransformation(String transformationId) {
        log.debug("Fetching transformation: {}", transformationId);
        return transformationRepository.findById(transformationId)
                .orElseThrow(() -> {
                    log.warn("Transformation not found: {}", transformationId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Transformation not found: " + transformationId);
                });
    }

    @Override
    public List<Transformation> listTransformations() {
        List<Transformation> list = transformationRepository.findAll();
        log.debug("Listed {} transformations", list.size());
        return list;
    }

    @Override
    public Transformation updateVoiceMapping(String transformationId, String userId,
                                             UpdateVoiceMappingRequest request) {
        log.info("Updating voice mapping for transformation={}, user={}", transformationId, userId);
        Transformation transformation = getTransformation(transformationId);
        assertOwner(transformation, userId);

        if (transformation.getStatus() == TransformationStatus.GENERATING
                || transformation.getStatus() == TransformationStatus.DONE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot update voice mapping when transformation is in status: " + transformation.getStatus());
        }

        transformation.setVoiceMapping(request.voiceMapping());
        transformation.setStatus(TransformationStatus.VOICE_ASSIGNMENT);
        transformation.setUpdatedAt(LocalDateTime.now());
        Transformation saved = transformationRepository.save(transformation);
        log.info("Voice mapping updated for transformation={}: {} author(s) assigned", transformationId,
                request.voiceMapping().size());
        return saved;
    }

    @Override
    public GenerateResponse triggerGeneration(String transformationId, String userId) {
        log.info("Triggering generation for transformation={}, user={}", transformationId, userId);
        Transformation transformation = getTransformation(transformationId);
        assertOwner(transformation, userId);

        if (transformation.getStatus() != TransformationStatus.VOICE_ASSIGNMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Transformation must be in VOICE_ASSIGNMENT status. Current: " + transformation.getStatus());
        }

        List<BookSection> sections = bookService.getSections(transformation.getBookId());
        Map<String, String> voiceMapping = transformation.getVoiceMapping();

        // Collect all unique authors across all paragraphs
        Set<String> bookAuthors = sections.stream()
                .flatMap(s -> s.getContent().stream())
                .map(ContentParagraph::getAuthor)
                .collect(Collectors.toSet());

        List<String> unassigned = bookAuthors.stream()
                .filter(author -> !voiceMapping.containsKey(author))
                .sorted()
                .collect(Collectors.toList());
        if (!unassigned.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Authors without voice assignment: " + unassigned);
        }

        Set<String> validVoiceIds = ttsClient.getVoices().stream()
                .map(VoiceDto::id)
                .collect(Collectors.toSet());
        log.debug("Available voice IDs from TTS service: {}", validVoiceIds);

        for (Map.Entry<String, String> entry : voiceMapping.entrySet()) {
            if (!validVoiceIds.contains(entry.getValue())) {
                log.warn("Invalid voiceId '{}' for author '{}'", entry.getValue(), entry.getKey());
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid voiceId '" + entry.getValue() + "' for author '" + entry.getKey()
                                + "'. Valid IDs: " + validVoiceIds);
            }
        }

        List<TtsSegmentInput> segments = new ArrayList<>();
        List<String> segmentSectionIds = new ArrayList<>();
        List<String> segmentAuthors = new ArrayList<>();
        int segmentNumber = 0;

        for (BookSection section : sections) {
            for (ContentParagraph paragraph : section.getContent()) {
                String author = paragraph.getAuthor();
                String voiceId = voiceMapping.get(author);

                segments.add(TtsSegmentInput.builder()
                        .segmentNumber(segmentNumber)
                        .text(paragraph.getText())
                        .voiceId(voiceId)
                        .transformationId(transformationId)
                        .build());

                segmentSectionIds.add(section.getSectionId());
                segmentAuthors.add(author);
                segmentNumber++;
            }
        }

        log.info("Sending {} segments to TTS service for transformation={}", segments.size(), transformationId);
        String ttsTaskId = ttsClient.createTask(new TtsTaskRequest(segments));

        transformation.setTtsTaskId(ttsTaskId);
        transformation.setSegmentSectionIds(segmentSectionIds);
        transformation.setSegmentAuthors(segmentAuthors);
        transformation.setStatus(TransformationStatus.GENERATING);
        transformation.setUpdatedAt(LocalDateTime.now());
        transformationRepository.save(transformation);

        ttsPollingService.pollUntilComplete(transformationId, ttsTaskId);

        log.info("Generation started for transformation={}, ttsTaskId={}", transformationId, ttsTaskId);
        return new GenerateResponse(transformationId, TransformationStatus.GENERATING.name(), ttsTaskId);
    }

    private void assertOwner(Transformation transformation, String userId) {
        if (!transformation.getUserId().equals(userId)) {
            log.warn("Unauthorized access to transformation={} by user={}", transformation.getId(), userId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Not authorized to modify this transformation");
        }
    }
}

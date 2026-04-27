package com.bookplayer.orchestrator.services.transformation;

import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.domain.book.ContentParagraph;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.domain.transformation.TransformationVisibility;
import com.bookplayer.orchestrator.domain.usage.UserDailyUsage;
import com.bookplayer.orchestrator.repository.ContentRepository;
import com.bookplayer.orchestrator.repository.TransformationRepository;
import com.bookplayer.orchestrator.repository.UserDailyUsageRepository;
import com.bookplayer.orchestrator.security.AuthenticatedUser;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.services.metrics.MetricService;
import com.bookplayer.orchestrator.services.tts.TtsClient;
import com.bookplayer.orchestrator.services.tts.TtsPollingService;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import com.bookplayer.orchestrator.transfer.transformation.request.CreateTransformationRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVisibilityRequest;
import com.bookplayer.orchestrator.transfer.transformation.request.UpdateVoiceMappingRequest;
import com.bookplayer.orchestrator.transfer.transformation.response.GenerateResponse;
import com.bookplayer.orchestrator.transfer.tts.TtsSegmentInput;
import com.bookplayer.orchestrator.transfer.tts.TtsTaskRequest;
import com.bookplayer.orchestrator.transfer.tts.VoiceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
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

    private final TransformationRepository transformationRepository;
    private final ContentRepository contentRepository;
    private final UserDailyUsageRepository userDailyUsageRepository;
    private final BookService bookService;
    private final MetricService metricService;
    private final TtsClient ttsClient;
    private final TtsPollingService ttsPollingService;

    @Override
    public Transformation createTransformation(AuthenticatedUser user, CreateTransformationRequest request) {
        log.info("Creating transformation for user={}, bookId={}", user.userId(), request.bookId());
        bookService.getBook(request.bookId());

        if (!user.isAdmin()) {
            String today = LocalDate.now().toString();
            UserDailyUsage usage = userDailyUsageRepository
                    .findByUserIdAndDate(user.userId(), today)
                    .orElse(null);
            if (usage != null && usage.getTransformationCount() >= 1) {
                log.warn("User {} reached daily transformation limit", user.userId());
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Daily transformation limit reached. Only 1 transformation allowed per day.");
            }
        }

        LocalDateTime now = LocalDateTime.now();
        Transformation transformation = Transformation.builder()
                .userId(user.userId())
                .bookId(request.bookId())
                .name(request.name())
                .status(TransformationStatus.DRAFT)
                .visibility(TransformationVisibility.PRIVATE)
                .createdAt(now)
                .updatedAt(now)
                .build();
        Transformation saved = transformationRepository.save(transformation);
        metricService.recordTransformationCreated(saved.getId(), user.userId());

        if (!user.isAdmin()) {
            String today = LocalDate.now().toString();
            UserDailyUsage usage = userDailyUsageRepository
                    .findByUserIdAndDate(user.userId(), today)
                    .orElseGet(() -> UserDailyUsage.builder()
                            .userId(user.userId())
                            .date(today)
                            .transformationCount(0)
                            .build());
            usage.setTransformationCount(usage.getTransformationCount() + 1);
            userDailyUsageRepository.save(usage);
        }
        log.info("Transformation created: id={}", saved.getId());
        return saved;
    }

    @Override
    public Transformation getTransformation(String transformationId, AuthenticatedUser user) {
        log.debug("Fetching transformation: {} user={}", transformationId, user != null ? user.userId() : "anonymous");

        if (user == null) {
            // Anonymous: only PUBLIC + DONE transformations are visible
            return transformationRepository.findById(transformationId)
                    .filter(t -> t.getVisibility() == TransformationVisibility.PUBLIC
                            && t.getStatus() == TransformationStatus.DONE)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Transformation not found: " + transformationId));
        }

        if (user.isAdmin()) {
            return findByIdOrThrow(transformationId);
        }

        // Authenticated user: own transformations always visible; public only when DONE
        return transformationRepository.findById(transformationId)
                .filter(t -> t.getUserId().equals(user.userId())
                        || (t.getVisibility() == TransformationVisibility.PUBLIC
                                && t.getStatus() == TransformationStatus.DONE))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Transformation not found: " + transformationId));
    }

    @Override
    public PagedResponse<Transformation> listTransformations(AuthenticatedUser user, String search, Pageable pageable) {
        boolean hasSearch = search != null && !search.isBlank();
        Page<Transformation> page;
        if (user == null) {
            page = hasSearch
                    ? transformationRepository.findByVisibilityAndStatusAndNameContainingIgnoreCase(TransformationVisibility.PUBLIC, TransformationStatus.DONE, search.trim(), pageable)
                    : transformationRepository.findByVisibilityAndStatus(TransformationVisibility.PUBLIC, TransformationStatus.DONE, pageable);
            log.debug("Anonymous listed {} public transformations (search='{}')", page.getTotalElements(), search);
        } else if (user.isAdmin()) {
            page = hasSearch
                    ? transformationRepository.findByNameContainingIgnoreCase(search.trim(), pageable)
                    : transformationRepository.findAll(pageable);
            log.debug("Admin listed {} transformations (search='{}')", page.getTotalElements(), search);
        } else {
            page = hasSearch
                    ? transformationRepository.findVisibleToUserAndNameContaining(user.userId(), search.trim(), pageable)
                    : transformationRepository.findVisibleToUser(user.userId(), pageable);
            log.debug("User {} listed {} transformations (search='{}')", user.userId(), page.getTotalElements(), search);
        }
        return new PagedResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Override
    public Transformation updateVoiceMapping(String transformationId, AuthenticatedUser user,
                                             UpdateVoiceMappingRequest request) {
        log.info("Updating voice mapping for transformation={}, user={}", transformationId, user.userId());
        Transformation transformation = findByIdOrThrow(transformationId);
        assertOwnerOrAdmin(transformation, user);

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
    public Transformation updateVisibility(String transformationId, AuthenticatedUser user,
                                           UpdateVisibilityRequest request) {
        log.info("Updating visibility for transformation={}, user={}, visibility={}",
                transformationId, user.userId(), request.visibility());
        Transformation transformation = findByIdOrThrow(transformationId);
        assertOwnerOrAdmin(transformation, user);

        transformation.setVisibility(request.visibility());
        transformation.setUpdatedAt(LocalDateTime.now());
        Transformation saved = transformationRepository.save(transformation);
        log.info("Visibility updated for transformation={}: {}", transformationId, request.visibility());
        return saved;
    }

    @Override
    public GenerateResponse triggerGeneration(String transformationId, AuthenticatedUser user) {
        log.info("Triggering generation for transformation={}, user={}", transformationId, user.userId());
        Transformation transformation = findByIdOrThrow(transformationId);
        assertOwnerOrAdmin(transformation, user);

        if (transformation.getStatus() != TransformationStatus.VOICE_ASSIGNMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Transformation must be in VOICE_ASSIGNMENT status. Current: " + transformation.getStatus());
        }

        List<BookSection> sections = bookService.getSections(transformation.getBookId());
        Map<String, String> voiceMapping = transformation.getVoiceMapping();

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
                        .emotion(paragraph.getEmotion() != null ? paragraph.getEmotion().name() : null)
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

    @Override
    public void deleteTransformation(String transformationId, AuthenticatedUser user) {
        log.info("Deleting transformation={} requested by user={}", transformationId, user.userId());
        Transformation transformation = findByIdOrThrow(transformationId);
        assertOwnerOrAdmin(transformation, user);

        contentRepository.deleteByTransformationId(transformationId);
        transformationRepository.deleteById(transformationId);
        log.info("Transformation {} deleted by user={}", transformationId, user.userId());
    }

    private Transformation findByIdOrThrow(String transformationId) {
        return transformationRepository.findById(transformationId)
                .orElseThrow(() -> {
                    log.warn("Transformation not found: {}", transformationId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Transformation not found: " + transformationId);
                });
    }

    private void assertOwnerOrAdmin(Transformation transformation, AuthenticatedUser user) {
        if (!user.isAdmin() && !transformation.getUserId().equals(user.userId())) {
            log.warn("Unauthorized access to transformation={} by user={}", transformation.getId(), user.userId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Not authorized to modify this transformation");
        }
    }
}

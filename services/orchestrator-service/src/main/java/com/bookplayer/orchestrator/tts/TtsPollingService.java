package com.bookplayer.orchestrator.tts;

import com.bookplayer.orchestrator.book.BookService;
import com.bookplayer.orchestrator.book.model.BookSection;
import com.bookplayer.orchestrator.content.ContentRepository;
import com.bookplayer.orchestrator.content.model.Content;
import com.bookplayer.orchestrator.content.model.ContentItem;
import com.bookplayer.orchestrator.transformation.TransformationRepository;
import com.bookplayer.orchestrator.transformation.model.Transformation;
import com.bookplayer.orchestrator.transformation.model.TransformationStatus;
import com.bookplayer.orchestrator.tts.model.TtsContentResponse;
import com.bookplayer.orchestrator.tts.model.TtsResolvedSegment;
import com.bookplayer.orchestrator.tts.model.TtsTaskStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TtsPollingService {

    @Value("${tts.polling.max-attempts:120}")
    private int maxPollAttempts = 120;

    @Value("${tts.polling.interval-ms:5000}")
    private long pollIntervalMs = 5_000;

    private final TtsClient ttsClient;
    private final TransformationRepository transformationRepository;
    private final ContentRepository contentRepository;
    private final BookService bookService;

    @Async("taskExecutor")
    public void pollUntilComplete(String transformationId, String ttsTaskId) {
        log.info("Polling started: transformation={} ttsTaskId={}", transformationId, ttsTaskId);

        for (int attempt = 0; attempt < maxPollAttempts; attempt++) {
            try {
                Thread.sleep(pollIntervalMs);

                TtsTaskStatusResponse statusResponse = ttsClient.getTaskStatus(ttsTaskId);
                log.debug("Poll {}/{}: ttsTaskId={} status={}", attempt + 1, maxPollAttempts, ttsTaskId, statusResponse.status());

                switch (statusResponse.status()) {
                    case "COMPLETED" -> {
                        handleCompleted(transformationId, ttsTaskId);
                        return;
                    }
                    case "FAILED" -> {
                        handleFailed(transformationId, statusResponse.error() != null ? statusResponse.error() : "TTS job failed");
                        return;
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Polling interrupted for transformation={}", transformationId);
                handleFailed(transformationId, "Polling interrupted");
                return;
            } catch (Exception e) {
                log.warn("Poll attempt {} error for transformation={}: {}", attempt + 1, transformationId, e.getMessage());
            }
        }

        log.error("Max poll attempts ({}) reached for transformation={}", maxPollAttempts, transformationId);
        handleFailed(transformationId, "Polling timeout after " + maxPollAttempts + " attempts");
    }

    private void handleCompleted(String transformationId, String ttsTaskId) {
        try {
            Transformation transformation = transformationRepository.findById(transformationId)
                    .orElseThrow(() -> new IllegalStateException("Transformation not found: " + transformationId));

            TtsContentResponse contentResponse = ttsClient.getTaskContent(ttsTaskId);

            List<String> segmentSectionIds = transformation.getSegmentSectionIds();
            List<BookSection> sections = bookService.getSections(transformation.getBookId());

            Map<String, BookSection> sectionMap = new HashMap<>();
            for (BookSection section : sections) {
                sectionMap.put(section.getSectionId(), section);
            }

            List<ContentItem> items = new ArrayList<>();
            for (TtsResolvedSegment seg : contentResponse.segments()) {
                String sectionId = segmentSectionIds.get(seg.segmentNumber());
                BookSection section = sectionMap.get(sectionId);
                String text = section.getContent().stream()
                        .map(p -> p.getText())
                        .collect(Collectors.joining(" "));

                items.add(ContentItem.builder()
                        .sectionId(sectionId)
                        .text(text)
                        .audioUri(seg.audioUrl())
                        .personaId(seg.personaId())
                        .build());
            }

            Content content = Content.builder()
                    .bookId(transformation.getBookId())
                    .transformationId(transformationId)
                    .items(items)
                    .build();
            contentRepository.save(content);

            transformation.setStatus(TransformationStatus.DONE);
            transformation.setUpdatedAt(LocalDateTime.now());
            transformationRepository.save(transformation);

            log.info("Transformation {} completed — {} content items assembled", transformationId, items.size());
        } catch (Exception e) {
            log.error("Content assembly failed for transformation={}: {}", transformationId, e.getMessage(), e);
            handleFailed(transformationId, "Content assembly failed: " + e.getMessage());
        }
    }

    private void handleFailed(String transformationId, String reason) {
        log.error("Transformation {} failed: {}", transformationId, reason);
        transformationRepository.findById(transformationId).ifPresent(t -> {
            t.setStatus(TransformationStatus.FAILED);
            t.setUpdatedAt(LocalDateTime.now());
            transformationRepository.save(t);
        });
    }
}

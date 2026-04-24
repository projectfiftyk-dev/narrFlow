package com.bookplayer.orchestrator.services.tts;

import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.domain.content.Content;
import com.bookplayer.orchestrator.domain.content.ContentItem;
import com.bookplayer.orchestrator.domain.transformation.Transformation;
import com.bookplayer.orchestrator.domain.transformation.TransformationStatus;
import com.bookplayer.orchestrator.repository.ContentRepository;
import com.bookplayer.orchestrator.repository.TransformationRepository;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.transfer.tts.TtsContentResponse;
import com.bookplayer.orchestrator.transfer.tts.TtsResolvedSegment;
import com.bookplayer.orchestrator.transfer.tts.TtsTaskStatusResponse;
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
                log.debug("Poll {}/{}: ttsTaskId={} status={}", attempt + 1, maxPollAttempts, ttsTaskId,
                        statusResponse.status());

                switch (statusResponse.status()) {
                    case "COMPLETED" -> {
                        handleCompleted(transformationId, ttsTaskId);
                        return;
                    }
                    case "FAILED" -> {
                        handleFailed(transformationId,
                                statusResponse.error() != null ? statusResponse.error() : "TTS job failed");
                        return;
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Polling interrupted for transformation={}", transformationId);
                handleFailed(transformationId, "Polling interrupted");
                return;
            } catch (Exception e) {
                log.warn("Poll attempt {} error for transformation={}: {}", attempt + 1, transformationId,
                        e.getMessage());
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
            List<String> segmentAuthors = transformation.getSegmentAuthors();
            Map<String, String> voiceMapping = transformation.getVoiceMapping();

            List<BookSection> sections = bookService.getSections(transformation.getBookId());
            Map<String, BookSection> sectionMap = new HashMap<>();
            for (BookSection section : sections) {
                sectionMap.put(section.getSectionId(), section);
            }

            List<ContentItem> items = new ArrayList<>();
            for (TtsResolvedSegment seg : contentResponse.segments()) {
                String sectionId = segmentSectionIds.get(seg.segmentNumber());
                String author = segmentAuthors.get(seg.segmentNumber());
                String voiceId = voiceMapping.get(author);
                BookSection section = sectionMap.get(sectionId);

                items.add(ContentItem.builder()
                        .sectionId(sectionId)
                        .sectionName(section.getSectionName())
                        .author(author)
                        .text(seg.text())
                        .audioUri(seg.audioUrl())
                        .voiceId(voiceId)
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

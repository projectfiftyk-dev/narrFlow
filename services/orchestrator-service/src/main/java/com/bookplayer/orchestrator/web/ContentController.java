package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.content.Content;
import com.bookplayer.orchestrator.services.content.ContentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;

    @GetMapping("/{transformationId}")
    public Content getContent(@PathVariable String transformationId) {
        log.debug("GET /content/{}", transformationId);
        return contentService.getContent(transformationId);
    }
}

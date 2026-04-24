package com.bookplayer.orchestrator.content;

import com.bookplayer.orchestrator.content.model.Content;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
public class ContentController {

    private final ContentService contentService;

    @GetMapping("/{transformationId}")
    public Content getContent(@PathVariable String transformationId) {
        return contentService.getContent(transformationId);
    }
}

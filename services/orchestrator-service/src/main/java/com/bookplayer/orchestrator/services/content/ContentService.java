package com.bookplayer.orchestrator.services.content;

import com.bookplayer.orchestrator.domain.content.Content;

public interface ContentService {
    Content getContent(String transformationId);
}

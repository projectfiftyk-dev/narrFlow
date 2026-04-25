package com.bookplayer.orchestrator.services.content;

import com.bookplayer.orchestrator.domain.content.Content;
import com.bookplayer.orchestrator.security.AuthenticatedUser;

public interface ContentService {
    Content getContent(String transformationId, AuthenticatedUser user);
}

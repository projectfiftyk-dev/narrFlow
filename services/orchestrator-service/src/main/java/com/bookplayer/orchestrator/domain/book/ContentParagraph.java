package com.bookplayer.orchestrator.domain.book;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContentParagraph {
    private String text;
    private String author;
}

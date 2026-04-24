package com.bookplayer.orchestrator.book.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookSection {
    private String sectionId;
    private String sectionName;
    private List<ContentParagraph> content;
}

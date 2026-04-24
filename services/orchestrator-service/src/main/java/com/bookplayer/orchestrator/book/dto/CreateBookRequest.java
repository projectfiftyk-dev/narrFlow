package com.bookplayer.orchestrator.book.dto;

import com.bookplayer.orchestrator.book.model.BookSection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateBookRequest(
        @NotBlank String title,
        String version,
        @NotEmpty List<BookSection> sections
) {}

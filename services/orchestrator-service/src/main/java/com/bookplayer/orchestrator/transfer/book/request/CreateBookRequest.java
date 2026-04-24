package com.bookplayer.orchestrator.transfer.book.request;

import com.bookplayer.orchestrator.domain.book.BookSection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateBookRequest(
        @NotBlank String title,
        String version,
        @NotEmpty List<BookSection> sections
) {}

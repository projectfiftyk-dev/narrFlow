package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.book.Book;
import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.security.SecurityUtils;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.transfer.book.request.CreateBookRequest;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
public class BookController {

    private static final Set<String> BOOK_SORT_FIELDS = Set.of("createdAt", "updatedAt", "title");

    private final BookService bookService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book createBook(@Valid @RequestBody CreateBookRequest request) {
        SecurityUtils.requireAdmin();
        log.info("POST /books title='{}'", request.title());
        return bookService.createBook(request);
    }

    @GetMapping
    public PagedResponse<Book> listBooks(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String field = BOOK_SORT_FIELDS.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = Sort.by(Sort.Direction.fromOptionalString(sortDir).orElse(Sort.Direction.DESC), field);
        log.debug("GET /books search='{}' sortBy={} sortDir={} page={} size={}", search, field, sortDir, page, size);
        return bookService.listBooks(search, PageRequest.of(page, size, sort));
    }

    @GetMapping("/{bookId}")
    public Book getBook(@PathVariable String bookId) {
        SecurityUtils.requireAuthenticated();
        log.debug("GET /books/{}", bookId);
        return bookService.getBook(bookId);
    }

    @GetMapping("/{bookId}/sections")
    public PagedResponse<BookSection> getSections(
            @PathVariable String bookId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        SecurityUtils.requireAuthenticated();
        log.debug("GET /books/{}/sections search='{}' page={} size={}", bookId, search, page, size);
        return bookService.getSections(bookId, search, PageRequest.of(page, size));
    }

    @GetMapping("/{bookId}/sections/{sectionId}")
    public BookSection getSection(@PathVariable String bookId, @PathVariable String sectionId) {
        SecurityUtils.requireAuthenticated();
        log.debug("GET /books/{}/sections/{}", bookId, sectionId);
        return bookService.getSection(bookId, sectionId);
    }
}

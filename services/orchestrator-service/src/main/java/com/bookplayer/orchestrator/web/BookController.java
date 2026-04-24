package com.bookplayer.orchestrator.web;

import com.bookplayer.orchestrator.domain.book.Book;
import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.services.book.BookService;
import com.bookplayer.orchestrator.transfer.book.request.CreateBookRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book createBook(@Valid @RequestBody CreateBookRequest request) {
        log.info("POST /books title='{}'", request.title());
        return bookService.createBook(request);
    }

    @GetMapping
    public List<Book> listBooks() {
        log.debug("GET /books");
        return bookService.listBooks();
    }

    @GetMapping("/{bookId}")
    public Book getBook(@PathVariable String bookId) {
        log.debug("GET /books/{}", bookId);
        return bookService.getBook(bookId);
    }

    @GetMapping("/{bookId}/sections")
    public List<BookSection> getSections(@PathVariable String bookId) {
        log.debug("GET /books/{}/sections", bookId);
        return bookService.getSections(bookId);
    }

    @GetMapping("/{bookId}/sections/{sectionId}")
    public BookSection getSection(@PathVariable String bookId, @PathVariable String sectionId) {
        log.debug("GET /books/{}/sections/{}", bookId, sectionId);
        return bookService.getSection(bookId, sectionId);
    }
}

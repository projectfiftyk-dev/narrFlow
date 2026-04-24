package com.bookplayer.orchestrator.book;

import com.bookplayer.orchestrator.book.dto.CreateBookRequest;
import com.bookplayer.orchestrator.book.model.Book;
import com.bookplayer.orchestrator.book.model.BookSection;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book createBook(@Valid @RequestBody CreateBookRequest request) {
        return bookService.createBook(request);
    }

    @GetMapping
    public List<Book> listBooks() {
        return bookService.listBooks();
    }

    @GetMapping("/{bookId}")
    public Book getBook(@PathVariable String bookId) {
        return bookService.getBook(bookId);
    }

    @GetMapping("/{bookId}/sections")
    public List<BookSection> getSections(@PathVariable String bookId) {
        return bookService.getSections(bookId);
    }

    @GetMapping("/{bookId}/sections/{sectionId}")
    public BookSection getSection(@PathVariable String bookId, @PathVariable String sectionId) {
        return bookService.getSection(bookId, sectionId);
    }
}

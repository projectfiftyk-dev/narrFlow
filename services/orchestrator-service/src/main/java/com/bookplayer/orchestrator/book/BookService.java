package com.bookplayer.orchestrator.book;

import com.bookplayer.orchestrator.book.dto.CreateBookRequest;
import com.bookplayer.orchestrator.book.model.Book;
import com.bookplayer.orchestrator.book.model.BookSection;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    public Book createBook(CreateBookRequest request) {
        Book book = Book.builder()
                .title(request.title())
                .version(request.version() != null ? request.version() : "1.0")
                .sections(request.sections())
                .createdAt(LocalDateTime.now())
                .build();
        return bookRepository.save(book);
    }

    public List<Book> listBooks() {
        return bookRepository.findAll();
    }

    public Book getBook(String bookId) {
        return bookRepository.findById(bookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found: " + bookId));
    }

    public List<BookSection> getSections(String bookId) {
        return getBook(bookId).getSections();
    }

    public BookSection getSection(String bookId, String sectionId) {
        return getSections(bookId).stream()
                .filter(s -> s.getSectionId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found: " + sectionId));
    }
}

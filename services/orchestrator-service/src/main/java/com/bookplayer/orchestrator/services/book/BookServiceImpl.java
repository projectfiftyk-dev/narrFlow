package com.bookplayer.orchestrator.services.book;

import com.bookplayer.orchestrator.domain.book.Book;
import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.repository.BookRepository;
import com.bookplayer.orchestrator.transfer.book.request.CreateBookRequest;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

    private final BookRepository bookRepository;

    @Override
    public Book createBook(CreateBookRequest request) {
        log.info("Creating book: title='{}', sections={}", request.title(), request.sections().size());
        LocalDateTime now = LocalDateTime.now();
        Book book = Book.builder()
                .title(request.title())
                .version(request.version() != null ? request.version() : "1.0")
                .sections(request.sections())
                .createdAt(now)
                .updatedAt(now)
                .build();
        Book saved = bookRepository.save(book);
        log.info("Book created: id={}", saved.getId());
        return saved;
    }

    @Override
    public PagedResponse<Book> listBooks(String search, Pageable pageable) {
        Page<Book> page = (search != null && !search.isBlank())
                ? bookRepository.findByTitleContainingIgnoreCase(search.trim(), pageable)
                : bookRepository.findAll(pageable);
        log.debug("Listed {} books (search='{}' page={} size={})", page.getTotalElements(),
                search, pageable.getPageNumber(), pageable.getPageSize());
        return new PagedResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Override
    public Book getBook(String bookId) {
        log.debug("Fetching book: {}", bookId);
        return bookRepository.findById(bookId)
                .orElseThrow(() -> {
                    log.warn("Book not found: {}", bookId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found: " + bookId);
                });
    }

    @Override
    public PagedResponse<BookSection> getSections(String bookId, String search, Pageable pageable) {
        List<BookSection> all = getBook(bookId).getSections();
        List<BookSection> filtered = (search != null && !search.isBlank())
                ? all.stream()
                    .filter(s -> s.getSectionName().toLowerCase().contains(search.trim().toLowerCase()))
                    .toList()
                : all;
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<BookSection> slice = start >= filtered.size() ? List.of() : filtered.subList(start, end);
        log.debug("Book {} has {} sections, filtered={}, page={}", bookId, all.size(),
                filtered.size(), pageable.getPageNumber());
        return new PagedResponse<>(slice, pageable.getPageNumber(), pageable.getPageSize(), filtered.size());
    }

    @Override
    public List<BookSection> getSections(String bookId) {
        List<BookSection> sections = getBook(bookId).getSections();
        log.debug("Book {} has {} sections", bookId, sections.size());
        return sections;
    }

    @Override
    public BookSection getSection(String bookId, String sectionId) {
        log.debug("Fetching section {} of book {}", sectionId, bookId);
        return getSections(bookId).stream()
                .filter(s -> s.getSectionId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> {
                    log.warn("Section not found: {} in book {}", sectionId, bookId);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Section not found: " + sectionId);
                });
    }
}

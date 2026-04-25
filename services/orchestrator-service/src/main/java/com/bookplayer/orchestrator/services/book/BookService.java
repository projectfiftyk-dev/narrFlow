package com.bookplayer.orchestrator.services.book;

import com.bookplayer.orchestrator.domain.book.Book;
import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.transfer.book.request.CreateBookRequest;
import com.bookplayer.orchestrator.transfer.common.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BookService {
    Book createBook(CreateBookRequest request);
    PagedResponse<Book> listBooks(String search, Pageable pageable);
    Book getBook(String bookId);
    PagedResponse<BookSection> getSections(String bookId, String search, Pageable pageable);
    List<BookSection> getSections(String bookId);
    BookSection getSection(String bookId, String sectionId);
}

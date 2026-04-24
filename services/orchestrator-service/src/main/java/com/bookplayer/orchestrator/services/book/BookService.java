package com.bookplayer.orchestrator.services.book;

import com.bookplayer.orchestrator.domain.book.Book;
import com.bookplayer.orchestrator.domain.book.BookSection;
import com.bookplayer.orchestrator.transfer.book.request.CreateBookRequest;

import java.util.List;

public interface BookService {
    Book createBook(CreateBookRequest request);
    List<Book> listBooks();
    Book getBook(String bookId);
    List<BookSection> getSections(String bookId);
    BookSection getSection(String bookId, String sectionId);
}

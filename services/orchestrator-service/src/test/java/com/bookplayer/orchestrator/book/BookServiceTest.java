package com.bookplayer.orchestrator.book;

import com.bookplayer.orchestrator.book.dto.CreateBookRequest;
import com.bookplayer.orchestrator.book.model.Book;
import com.bookplayer.orchestrator.book.model.BookSection;
import com.bookplayer.orchestrator.book.model.ContentParagraph;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock
    BookRepository bookRepository;

    @InjectMocks
    BookService bookService;

    @Test
    void createBook_savesBookWithDefaultVersion() {
        CreateBookRequest request = new CreateBookRequest("My Book", null, List.of());
        Book saved = Book.builder().id("b1").title("My Book").version("1.0").sections(List.of()).build();
        when(bookRepository.save(any())).thenReturn(saved);

        Book result = bookService.createBook(request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getVersion()).isEqualTo("1.0");
        assertThat(result.getId()).isEqualTo("b1");
    }

    @Test
    void createBook_usesProvidedVersion() {
        CreateBookRequest request = new CreateBookRequest("Book", "2.0", List.of());
        when(bookRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        bookService.createBook(request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getVersion()).isEqualTo("2.0");
    }

    @Test
    void listBooks_returnsAll() {
        List<Book> books = List.of(Book.builder().id("b1").build(), Book.builder().id("b2").build());
        when(bookRepository.findAll()).thenReturn(books);

        assertThat(bookService.listBooks()).hasSize(2);
    }

    @Test
    void getBook_whenFound_returnsBook() {
        Book book = Book.builder().id("b1").title("Found").build();
        when(bookRepository.findById("b1")).thenReturn(Optional.of(book));

        assertThat(bookService.getBook("b1").getTitle()).isEqualTo("Found");
    }

    @Test
    void getBook_whenNotFound_throwsNotFound() {
        when(bookRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.getBook("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Book not found");
    }

    @Test
    void getSections_returnsBookSections() {
        BookSection s1 = new BookSection("s1", "Chapter 1", List.of());
        BookSection s2 = new BookSection("s2", "Chapter 2", List.of());
        Book book = Book.builder().id("b1").sections(List.of(s1, s2)).build();
        when(bookRepository.findById("b1")).thenReturn(Optional.of(book));

        List<BookSection> sections = bookService.getSections("b1");

        assertThat(sections).hasSize(2);
        assertThat(sections.get(0).getSectionId()).isEqualTo("s1");
    }

    @Test
    void getSection_whenFound_returnsSection() {
        BookSection s1 = new BookSection("s1", "Chapter 1", List.of(new ContentParagraph("Hello")));
        Book book = Book.builder().id("b1").sections(List.of(s1)).build();
        when(bookRepository.findById("b1")).thenReturn(Optional.of(book));

        BookSection result = bookService.getSection("b1", "s1");

        assertThat(result.getSectionName()).isEqualTo("Chapter 1");
    }

    @Test
    void getSection_whenNotFound_throwsNotFound() {
        Book book = Book.builder().id("b1").sections(List.of(new BookSection("s1", "Ch1", List.of()))).build();
        when(bookRepository.findById("b1")).thenReturn(Optional.of(book));

        assertThatThrownBy(() -> bookService.getSection("b1", "s99"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Section not found");
    }
}

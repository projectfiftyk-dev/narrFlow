package com.bookplayer.orchestrator.book;

import com.bookplayer.orchestrator.book.model.Book;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BookRepository extends MongoRepository<Book, String> {}

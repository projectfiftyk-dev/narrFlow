package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.book.Book;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BookRepository extends MongoRepository<Book, String> {}

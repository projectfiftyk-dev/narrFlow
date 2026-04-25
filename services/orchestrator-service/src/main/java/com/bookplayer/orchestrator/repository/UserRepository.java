package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.user.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByAccountId(String accountId);
    Optional<User> findByEmail(String email);
}

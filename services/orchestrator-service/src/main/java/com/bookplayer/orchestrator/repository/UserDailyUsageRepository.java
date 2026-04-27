package com.bookplayer.orchestrator.repository;

import com.bookplayer.orchestrator.domain.usage.UserDailyUsage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserDailyUsageRepository extends MongoRepository<UserDailyUsage, String> {
    Optional<UserDailyUsage> findByUserIdAndDate(String userId, String date);
}

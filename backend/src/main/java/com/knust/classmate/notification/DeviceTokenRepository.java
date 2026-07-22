package com.knust.classmate.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByExpoPushToken(String expoPushToken);

    List<DeviceToken> findByUserId(Long userId);

    List<DeviceToken> findByUserIdIn(List<Long> userIds);
}

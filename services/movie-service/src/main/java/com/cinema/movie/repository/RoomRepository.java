package com.cinema.movie.repository;

import com.cinema.movie.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByCinemaId(Long cinemaId);
}
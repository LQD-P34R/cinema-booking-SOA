package com.cinema.movie.repository;

import com.cinema.movie.entity.Movie;
import com.cinema.movie.entity.MovieStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MovieRepository extends JpaRepository<Movie, Long> {

    /**
     * Tìm phim theo từ khóa (tên), thể loại và trạng thái.
     * Tham số nào là null thì bỏ qua điều kiện đó.
     */
    @Query("""
            SELECT m FROM Movie m
            WHERE (:keyword IS NULL OR LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:genre IS NULL OR LOWER(m.genre) LIKE LOWER(CONCAT('%', :genre, '%')))
              AND (:status IS NULL OR m.status = :status)
            ORDER BY m.releaseDate DESC, m.id DESC
            """)
    List<Movie> search(@Param("keyword") String keyword,
                       @Param("genre") String genre,
                       @Param("status") MovieStatus status);
}
package com.ordermanager.config;

import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Runs database migrations that Hibernate ddl-auto: update cannot handle,
 * such as updating CHECK constraints when enum values change.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigration {

    private final DataSource dataSource;

    @PostConstruct
    public void migrate() {
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {

            // Update orders_status_check constraint to include COMPLETED and CANCELLED
            stmt.execute("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
            stmt.execute("""
                ALTER TABLE orders ADD CONSTRAINT orders_status_check
                CHECK (status::text = ANY(ARRAY['PENDING','PACKED','COMPLETED','CANCELLED','RETURNED','RETURN_CHECKED']))
            """);
            log.info("Database migration: orders_status_check constraint updated successfully");

        } catch (Exception e) {
            log.warn("Database migration warning: {}", e.getMessage());
        }
    }
}

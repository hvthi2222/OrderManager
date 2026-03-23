package com.ordermanager.parser;

import com.ordermanager.entity.Order;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interface for platform-specific order import parsers.
 * Each e-commerce platform has its own CSV/Excel format.
 */
public interface OrderImportParser {

    /**
     * Parse uploaded file into grouped orders with items.
     * Multiple rows with the same order code are grouped into one Order with multiple OrderItems.
     */
    List<Order> parse(MultipartFile file) throws Exception;

    /**
     * Platform name this parser handles (e.g. "Shopee", "Lazada").
     */
    String getPlatform();
}

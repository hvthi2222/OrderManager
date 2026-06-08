package com.ordermanager.parser;

import com.ordermanager.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Factory that returns the correct parser based on platform name.
 */
@Component
public class OrderParserFactory {

    private final Map<String, OrderImportParser> parsers;

    public OrderParserFactory(List<OrderImportParser> parserList) {
        this.parsers = new LinkedHashMap<>();
        for (OrderImportParser parser : parserList) {
            String normalized = normalizePlatform(parser.getPlatform());
            if (normalized != null && !parsers.containsKey(normalized)) {
                parsers.put(normalized, parser);
            }

            String compact = normalized != null ? normalized.replaceAll("\\s+", "") : null;
            if (compact != null && !compact.isBlank() && !parsers.containsKey(compact)) {
                parsers.put(compact, parser);
            }
        }
    }

    public OrderImportParser getParser(String platform) {
        String normalized = normalizePlatform(platform);
        final String key = (normalized == null || normalized.isBlank()) ? "shopee" : normalized;

        OrderImportParser parser = parsers.get(key);
        if (parser == null) {
            parser = parsers.get(key.replaceAll("\\s+", ""));
        }
        if (parser == null) {
            parser = parsers.entrySet().stream()
                    .filter(entry -> key.contains("tiktok") && entry.getKey().contains("tiktok"))
                    .map(Map.Entry::getValue)
                    .findFirst()
                    .orElse(null);
        }
        if (parser == null) {
            throw new BusinessException("Không hỗ trợ import từ sàn: " + key +
                    ". Các sàn hỗ trợ: " + String.join(", ", parsers.keySet()));
        }
        return parser;
    }

    private String normalizePlatform(String platform) {
        if (platform == null) return null;
        return platform.trim().toLowerCase();
    }
}

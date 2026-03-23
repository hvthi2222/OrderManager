package com.ordermanager.parser;

import com.ordermanager.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory that returns the correct parser based on platform name.
 */
@Component
public class OrderParserFactory {

    private final Map<String, OrderImportParser> parsers;

    public OrderParserFactory(List<OrderImportParser> parserList) {
        this.parsers = parserList.stream()
                .collect(Collectors.toMap(
                        p -> p.getPlatform().toLowerCase(),
                        Function.identity()
                ));
    }

    public OrderImportParser getParser(String platform) {
        String key = (platform != null && !platform.isBlank()) ? platform.toLowerCase() : "shopee";
        OrderImportParser parser = parsers.get(key);
        if (parser == null) {
            throw new BusinessException("Không hỗ trợ import từ sàn: " + key +
                    ". Các sàn hỗ trợ: " + String.join(", ", parsers.keySet()));
        }
        return parser;
    }
}

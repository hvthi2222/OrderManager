package com.ordermanager.util;

public class DataMaskingUtils {

    /**
     * Mask customer name: keeps the first word, masks the middle, keeps the last word.
     * Example: "Nguyễn Văn A" -> "Nguyễn *** A"
     * Example: "Anh Duy" -> "Anh ***"
     */
    public static String maskName(String name) {
        if (name == null || name.length() <= 2) return name;
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return name.charAt(0) + "***";
        }
        if (parts.length == 2) {
            return parts[0] + " ***";
        }
        return parts[0] + " *** " + parts[parts.length - 1];
    }

    /**
     * Mask phone number: keeps first 3 digits and last 4 digits.
     * Example: "0987654321" -> "098***4321"
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "***" + phone.substring(phone.length() - 4);
    }
}

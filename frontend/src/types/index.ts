export type Role = "ADMIN" | "EMPLOYEE";
export type OrderStatus = "PENDING" | "PACKED" | "COMPLETED" | "CANCELLED" | "RETURNED" | "RETURN_CHECKED";
export type VideoType = "PACK" | "RETURN_CHECK";
export type ImportSource = "MANUAL" | "FILE" | "API";

export interface User {
    id: number;
    username: string;
    fullName: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
}

export interface LoginResponse {
    token: string;
    userId: number;
    username: string;
    fullName: string;
    role: Role;
}

export type ReturnEvaluation = "NORMAL" | "SUSPICIOUS_LOST" | "SUSPICIOUS_SWAPPED";

export interface OrderItem {
    id: number;
    productName: string;
    variantName: string | null;
    quantity: number;
    checked: boolean;
}

export interface Order {
    id: number;
    trackingCode: string;
    shopOrderCode: string | null;
    platform: string;
    status: OrderStatus;
    customerName: string;
    customerPhone: string;
    productInfo: string;
    shippingCarrier: string | null;
    note: string | null;
    packedByName: string | null;
    packedById: number | null;
    orderDate: string;
    packedAt: string | null;
    returnedAt: string | null;
    deliveredAt: string | null;
    importSource: ImportSource;
    createdAt: string;
    hasVideo: boolean;
    packVideoUrl: string | null;
    returnVideoUrl: string | null;
    packVideoFraudDetected?: boolean | null;
    packVideoFraudMessages?: string[] | null;
    packVideoFraudAnalyzedAt?: string | null;
    returnVideoFraudDetected?: boolean | null;
    returnVideoFraudMessages?: string[] | null;
    returnVideoFraudAnalyzedAt?: string | null;
    returnEvaluation: ReturnEvaluation | null;
    returnNote: string | null;
    returnRefundStatus: string | null;
    cancelReason: string | null;
    buyerNote: string | null;
    province: string | null;
    predictionRisk: number | null;
    updatedAt: string | null;
    items: OrderItem[];
}

export interface ScanResponse {
    valid: boolean;
    alertType: "ALREADY_PACKED" | "NOT_FOUND" | "WRONG_TYPE" | null;
    alertMessage: string | null;
    order: Order | null;
}

export interface Video {
    id: number;
    orderId: number;
    filePath: string;
    fileName: string;
    videoType: VideoType;
    recordedByName: string;
    recordedAt: string;
    expiresAt: string;
    fileSize: number;
}

export interface PageResponse<T> {
    content: T[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface ReportSummary {
    totalPacked: number;
    totalReturned: number;
    totalReturnChecked: number;
    totalPending: number;
    totalCompleted: number;
    totalCancelled: number;
    startDate: string;
    endDate: string;
}

export interface EmployeeStat {
    employeeId: number;
    employeeName: string;
    orderCount: number;
}

export interface PlatformStat {
    platform: string;
    orderCount: number;
}

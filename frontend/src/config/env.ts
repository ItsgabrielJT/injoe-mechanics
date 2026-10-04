export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8003/api/v1",
  sriSignUrl: process.env.NEXT_PUBLIC_SRI_SIGN_URL ?? "http://localhost:8000/sri",
  sriSignSecret: process.env.NEXT_PUBLIC_SRI_SIGN_SECRET ?? "admin123",
  pdfRucProveedor: process.env.NEXT_PUBLIC_PDF_RUC_PROVEEDOR ?? "1722879176001",
};

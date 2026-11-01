import { api } from "@/lib/api";
import { ProductDto, SiteSettingDto } from "@/lib/api/admin";

/**
 * Fetch active products and elevator packages for the public storefront
 * Endpoint: GET /api/v1/products (No authentication required)
 */
export const fetchPublicProducts = async (params?: {
  skip?: number;
  limit?: number;
}) => {
  return await api.get<ProductDto[]>("/products", { params });
};

/**
 * Fetch global public site configuration (hero banners, contact info, about text)
 * Endpoint: GET /api/v1/cms/settings (No authentication required)
 */
export const fetchPublicSiteSettings = async () => {
  return await api.get<SiteSettingDto>("/cms/settings");
};

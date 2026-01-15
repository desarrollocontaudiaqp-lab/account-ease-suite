import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PDF_CONFIG, PDFStyleConfig } from "@/lib/generateProformaPDF";

/**
 * Fetches PDF styles for a given proforma type from the database.
 * Returns the merged config with defaults if no custom styles exist.
 */
export async function getPDFStylesForType(tipo: string): Promise<PDFStyleConfig> {
  console.log("[getPDFStylesForType] Loading styles for tipo:", tipo);
  
  // First, try to find a plantilla that matches this type
  const { data: plantilla, error } = await supabase
    .from("proforma_plantillas")
    .select("estilos_pdf")
    .eq("tipo", tipo)
    .eq("activa", true)
    .limit(1)
    .single();

  console.log("[getPDFStylesForType] Query result:", { plantilla, error });

  if (plantilla?.estilos_pdf && typeof plantilla.estilos_pdf === "object" && !Array.isArray(plantilla.estilos_pdf) && Object.keys(plantilla.estilos_pdf).length > 0) {
    const savedConfig = plantilla.estilos_pdf as unknown as Partial<PDFStyleConfig>;
    console.log("[getPDFStylesForType] Found saved config:", savedConfig);
    const mergedConfig = {
      colors: { ...DEFAULT_PDF_CONFIG.colors, ...savedConfig.colors },
      typography: { ...DEFAULT_PDF_CONFIG.typography, ...savedConfig.typography },
      layout: { ...DEFAULT_PDF_CONFIG.layout, ...savedConfig.layout },
      company: { ...DEFAULT_PDF_CONFIG.company, ...savedConfig.company },
      bank: { ...DEFAULT_PDF_CONFIG.bank, ...savedConfig.bank },
    };
    console.log("[getPDFStylesForType] Merged config colors:", mergedConfig.colors);
    return mergedConfig;
  }

  console.log("[getPDFStylesForType] No custom styles found, using defaults");
  return DEFAULT_PDF_CONFIG;
}

/**
 * Fetches PDF styles for a specific plantilla ID from the database.
 * Returns the merged config with defaults if no custom styles exist.
 */
export async function getPDFStylesForPlantilla(plantillaId: string): Promise<PDFStyleConfig> {
  const { data: plantilla } = await supabase
    .from("proforma_plantillas")
    .select("estilos_pdf")
    .eq("id", plantillaId)
    .single();

  if (plantilla?.estilos_pdf && typeof plantilla.estilos_pdf === "object" && !Array.isArray(plantilla.estilos_pdf) && Object.keys(plantilla.estilos_pdf).length > 0) {
    const savedConfig = plantilla.estilos_pdf as unknown as Partial<PDFStyleConfig>;
    return {
      colors: { ...DEFAULT_PDF_CONFIG.colors, ...savedConfig.colors },
      typography: { ...DEFAULT_PDF_CONFIG.typography, ...savedConfig.typography },
      layout: { ...DEFAULT_PDF_CONFIG.layout, ...savedConfig.layout },
      company: { ...DEFAULT_PDF_CONFIG.company, ...savedConfig.company },
      bank: { ...DEFAULT_PDF_CONFIG.bank, ...savedConfig.bank },
    };
  }

  return DEFAULT_PDF_CONFIG;
}

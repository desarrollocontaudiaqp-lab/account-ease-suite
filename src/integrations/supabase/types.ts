export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asignaciones: {
        Row: {
          asignado_a: string | null
          asignado_por: string | null
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          descripcion: string | null
          fecha_inicio: string
          fecha_vencimiento: string | null
          horas_estimadas: number | null
          horas_trabajadas: number | null
          id: string
          notas: string | null
          prioridad: Database["public"]["Enums"]["assignment_priority"]
          status: Database["public"]["Enums"]["assignment_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          asignado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          horas_estimadas?: number | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          prioridad?: Database["public"]["Enums"]["assignment_priority"]
          status?: Database["public"]["Enums"]["assignment_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          asignado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_inicio?: string
          fecha_vencimiento?: string | null
          horas_estimadas?: number | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          prioridad?: Database["public"]["Enums"]["assignment_priority"]
          status?: Database["public"]["Enums"]["assignment_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_trabajo: {
        Row: {
          asignacion_id: string | null
          cliente_id: string | null
          color: string | null
          completado: boolean
          created_at: string
          descripcion: string | null
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          tipo: string
          titulo: string
          todo_el_dia: boolean
          updated_at: string
          usuario_id: string
        }
        Insert: {
          asignacion_id?: string | null
          cliente_id?: string | null
          color?: string | null
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo?: string
          titulo: string
          todo_el_dia?: boolean
          updated_at?: string
          usuario_id: string
        }
        Update: {
          asignacion_id?: string | null
          cliente_id?: string | null
          color?: string | null
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo?: string
          titulo?: string
          todo_el_dia?: boolean
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendario_trabajo_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendario_trabajo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cartera_clientes: {
        Row: {
          cartera_id: string
          cliente_id: string
          created_at: string
          id: string
        }
        Insert: {
          cartera_id: string
          cliente_id: string
          created_at?: string
          id?: string
        }
        Update: {
          cartera_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartera_clientes_cartera_id_fkey"
            columns: ["cartera_id"]
            isOneToOne: false
            referencedRelation: "carteras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartera_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      carteras: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          responsable_id: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          responsable_id?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          responsable_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          actividad_economica: string | null
          activo: boolean
          clave_sunat: string | null
          codigo: string
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_nombre2: string | null
          contacto_telefono: string | null
          contacto_telefono2: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre_comercial: string | null
          nombre_persona_natural: string | null
          notas: string | null
          nro_trabajadores: number | null
          razon_social: string
          regimen_laboral: string | null
          regimen_tributario: string | null
          sector: string | null
          telefono: string | null
          tipo_cliente: string
          updated_at: string
          usuario_sunat: string | null
        }
        Insert: {
          actividad_economica?: string | null
          activo?: boolean
          clave_sunat?: string | null
          codigo: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_nombre2?: string | null
          contacto_telefono?: string | null
          contacto_telefono2?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          nombre_persona_natural?: string | null
          notas?: string | null
          nro_trabajadores?: number | null
          razon_social: string
          regimen_laboral?: string | null
          regimen_tributario?: string | null
          sector?: string | null
          telefono?: string | null
          tipo_cliente?: string
          updated_at?: string
          usuario_sunat?: string | null
        }
        Update: {
          actividad_economica?: string | null
          activo?: boolean
          clave_sunat?: string | null
          codigo?: string
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_nombre2?: string | null
          contacto_telefono?: string | null
          contacto_telefono2?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          nombre_persona_natural?: string | null
          notas?: string | null
          nro_trabajadores?: number | null
          razon_social?: string
          regimen_laboral?: string | null
          regimen_tributario?: string | null
          sector?: string | null
          telefono?: string | null
          tipo_cliente?: string
          updated_at?: string
          usuario_sunat?: string | null
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          clave: string
          created_at: string
          descripcion: string | null
          id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          clave: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          clave?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      contratos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descripcion: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          moneda: string
          monto_mensual: number | null
          monto_total: number | null
          notas: string | null
          numero: string
          responsable_id: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tipo_servicio: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descripcion: string
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          moneda?: string
          monto_mensual?: number | null
          monto_total?: number | null
          notas?: string | null
          numero: string
          responsable_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo_servicio: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          moneda?: string
          monto_mensual?: number | null
          monto_total?: number | null
          notas?: string | null
          numero?: string
          responsable_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo_servicio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          contrato_id: string
          created_at: string
          created_by: string | null
          fecha_pago: string | null
          fecha_vencimiento: string
          id: string
          metodo_pago: string | null
          monto: number
          notas: string | null
          proforma_id: string | null
          referencia: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string | null
          fecha_vencimiento: string
          id?: string
          metodo_pago?: string | null
          monto: number
          notas?: string | null
          proforma_id?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          proforma_id?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proforma_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          proforma_id: string
          subtotal: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario: number
          proforma_id: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          proforma_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "proforma_items_proforma_id_fkey"
            columns: ["proforma_id"]
            isOneToOne: false
            referencedRelation: "proformas"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_plantillas: {
        Row: {
          activa: boolean
          campos: Json
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["proforma_tipo"]
          updated_at: string
        }
        Insert: {
          activa?: boolean
          campos?: Json
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["proforma_tipo"]
          updated_at?: string
        }
        Update: {
          activa?: boolean
          campos?: Json
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["proforma_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      proforma_secuencias: {
        Row: {
          created_at: string
          id: string
          prefijo: string
          tipo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prefijo: string
          tipo: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prefijo?: string
          tipo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      proformas: {
        Row: {
          campos_personalizados: Json | null
          cliente_id: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          fecha_emision: string
          fecha_vencimiento: string
          id: string
          igv: number
          moneda: string
          notas: string | null
          numero: string
          status: Database["public"]["Enums"]["proforma_status"]
          subtotal: number
          tipo: Database["public"]["Enums"]["proforma_tipo"]
          total: number
          updated_at: string
        }
        Insert: {
          campos_personalizados?: Json | null
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          fecha_vencimiento: string
          id?: string
          igv?: number
          moneda?: string
          notas?: string | null
          numero: string
          status?: Database["public"]["Enums"]["proforma_status"]
          subtotal?: number
          tipo?: Database["public"]["Enums"]["proforma_tipo"]
          total?: number
          updated_at?: string
        }
        Update: {
          campos_personalizados?: Json | null
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string
          id?: string
          igv?: number
          moneda?: string
          notas?: string | null
          numero?: string
          status?: Database["public"]["Enums"]["proforma_status"]
          subtotal?: number
          tipo?: Database["public"]["Enums"]["proforma_tipo"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proformas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proformas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permisos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre_display: string
          permisos: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_display: string
          permisos?: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_display?: string
          permisos?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean
          categoria: string
          created_at: string
          id: string
          precio: number
          producto: string | null
          servicio: string
          tipo: string
          updated_at: string
          variante: string | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          created_at?: string
          id?: string
          precio?: number
          producto?: string | null
          servicio: string
          tipo: string
          updated_at?: string
          variante?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          precio?: number
          producto?: string | null
          servicio?: string
          tipo?: string
          updated_at?: string
          variante?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_proforma_number: { Args: { p_tipo: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrador"
        | "gerente"
        | "asesor"
        | "auxiliar"
        | "practicante"
        | "supervisor"
        | "contador"
        | "asistente"
      assignment_priority: "baja" | "media" | "alta" | "urgente"
      assignment_status:
        | "pendiente"
        | "en_progreso"
        | "completada"
        | "cancelada"
      contract_status: "activo" | "pausado" | "finalizado" | "cancelado"
      payment_status: "pendiente" | "pagado" | "vencido" | "parcial"
      proforma_status:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "facturada"
      proforma_tipo: "contabilidad" | "tramites"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrador",
        "gerente",
        "asesor",
        "auxiliar",
        "practicante",
        "supervisor",
        "contador",
        "asistente",
      ],
      assignment_priority: ["baja", "media", "alta", "urgente"],
      assignment_status: [
        "pendiente",
        "en_progreso",
        "completada",
        "cancelada",
      ],
      contract_status: ["activo", "pausado", "finalizado", "cancelado"],
      payment_status: ["pendiente", "pagado", "vencido", "parcial"],
      proforma_status: [
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "facturada",
      ],
      proforma_tipo: ["contabilidad", "tramites"],
    },
  },
} as const

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null
          client_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          org_id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: Database["public"]["Enums"]["activity_kind"]
          org_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          org_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          org_id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          org_id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          org_id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          district: string | null
          document: string | null
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["client_kind"]
          name: string
          notes: string | null
          number: string | null
          org_id: string
          owner_id: string | null
          phone: string | null
          segment: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          street: string | null
          tags: string[]
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name: string
          notes?: string | null
          number?: string | null
          org_id: string
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          tags?: string[]
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["client_kind"]
          name?: string
          notes?: string | null
          number?: string | null
          org_id?: string
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          street?: string | null
          tags?: string[]
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          entity_id: string
          entity_type: string
          id: string
          mentions: string[]
          org_id: string
          parent_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          mentions?: string[]
          org_id: string
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          mentions?: string[]
          org_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          contract_no: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_id: string | null
          deleted_at: string | null
          end_date: string | null
          file_id: string | null
          id: string
          notes: string | null
          org_id: string
          renewal_notice_days: number | null
          signed_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tags: string[]
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          client_id?: string | null
          contract_no?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          file_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          renewal_notice_days?: number | null
          signed_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[]
          title: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          client_id?: string | null
          contract_no?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_id?: string | null
          deleted_at?: string | null
          end_date?: string | null
          file_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          renewal_notice_days?: number | null
          signed_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          expected_close: string | null
          id: string
          lost_reason: string | null
          org_id: string
          owner_id: string | null
          pipeline_id: string
          position: string
          probability: number | null
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          tags: string[]
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expected_close?: string | null
          id?: string
          lost_reason?: string | null
          org_id: string
          owner_id?: string | null
          pipeline_id: string
          position: string
          probability?: number | null
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          tags?: string[]
          title: string
          updated_at?: string
          value_cents?: number
        }
        Update: {
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expected_close?: string | null
          id?: string
          lost_reason?: string | null
          org_id?: string
          owner_id?: string | null
          pipeline_id?: string
          position?: string
          probability?: number | null
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          response: string
          user_id: string
        }
        Insert: {
          event_id: string
          response?: string
          user_id: string
        }
        Update: {
          event_id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          location: string | null
          org_id: string
          owner_id: string | null
          rrule: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          location?: string | null
          org_id: string
          owner_id?: string | null
          rrule?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          location?: string | null
          org_id?: string
          owner_id?: string | null
          rrule?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_links: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          folder_id: string | null
          id: string
          mime: string
          name: string
          org_id: string
          replaces_id: string | null
          size: number
          storage_path: string
          version: number
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          mime: string
          name: string
          org_id: string
          replaces_id?: string | null
          size: number
          storage_path: string
          version?: number
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          mime?: string
          name?: string
          org_id?: string
          replaces_id?: string | null
          size?: number
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_replaces_id_fkey"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_private: boolean
          name: string
          org_id: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          name: string
          org_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_private?: boolean
          name?: string
          org_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          org_id: string
          read_at: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          org_id: string
          read_at?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          org_id?: string
          read_at?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          org_id: string
          pipeline_id: string
          position: string
          wip_limit: number | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          org_id: string
          pipeline_id: string
          position: string
          wip_limit?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          org_id?: string
          pipeline_id?: string
          position?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          org_id: string
          position: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          position: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          color: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          due_on: string | null
          id: string
          name: string
          org_id: string
          owner_id: string | null
          position: string
          starts_on: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          name: string
          org_id: string
          owner_id?: string | null
          position: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_on?: string | null
          id?: string
          name?: string
          org_id?: string
          owner_id?: string | null
          position?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          position: string
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          position: string
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          position?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_columns: {
        Row: {
          color: string
          created_at: string
          id: string
          is_done: boolean
          name: string
          org_id: string
          position: string
          project_id: string
          wip_limit: number | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          name: string
          org_id: string
          position: string
          project_id: string
          wip_limit?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          name?: string
          org_id?: string
          position?: string
          project_id?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_columns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          task_id: string
          user_id: string
        }
        Insert: {
          task_id: string
          user_id: string
        }
        Update: {
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          client_id: string | null
          column_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          due_on: string | null
          estimate_min: number | null
          id: string
          org_id: string
          parent_id: string | null
          position: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          spent_min: number
          starts_on: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          client_id?: string | null
          column_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_on?: string | null
          estimate_min?: number | null
          id?: string
          org_id: string
          parent_id?: string | null
          position: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          spent_min?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          client_id?: string | null
          column_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_on?: string | null
          estimate_min?: number | null
          id?: string
          org_id?: string
          parent_id?: string | null
          position?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          spent_min?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "task_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          id: string
          logged_on: string
          minutes: number
          note: string | null
          org_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_on?: string
          minutes: number
          note?: string | null
          org_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_on?: string
          minutes?: number
          note?: string | null
          org_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { p_org: string }; Returns: boolean }
      dashboard_summary: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: Json
      }
      folder_ancestors: {
        Args: { p_folder: string }
        Returns: {
          depth: number
          id: string
          name: string
        }[]
      }
      is_member: { Args: { p_org: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_org_ids: { Args: never; Returns: string[] }
      user_role_in: {
        Args: { p_org: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      activity_kind:
        | "client_created"
        | "client_updated"
        | "deal_created"
        | "deal_moved"
        | "deal_won"
        | "deal_lost"
        | "contract_uploaded"
        | "contract_status_changed"
        | "event_created"
        | "note_added"
        | "project_created"
        | "task_created"
        | "task_moved"
        | "task_completed"
      client_kind: "pf" | "pj"
      client_status: "lead" | "active" | "inactive" | "churned"
      contract_status:
        | "draft"
        | "sent"
        | "signed"
        | "active"
        | "expired"
        | "cancelled"
      deal_status: "open" | "won" | "lost"
      event_kind: "meeting" | "call" | "task" | "deadline" | "other"
      member_role: "owner" | "admin" | "member" | "viewer"
      notification_kind:
        | "mention"
        | "task_assigned"
        | "task_due_soon"
        | "task_completed"
        | "deal_moved"
        | "deal_won"
        | "deal_lost"
        | "deal_stale"
        | "contract_expiring"
        | "event_reminder"
        | "message_received"
        | "automation_failed"
      project_status: "active" | "on_hold" | "done" | "archived"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done" | "cancelled"
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
      activity_kind: [
        "client_created",
        "client_updated",
        "deal_created",
        "deal_moved",
        "deal_won",
        "deal_lost",
        "contract_uploaded",
        "contract_status_changed",
        "event_created",
        "note_added",
        "project_created",
        "task_created",
        "task_moved",
        "task_completed",
      ],
      client_kind: ["pf", "pj"],
      client_status: ["lead", "active", "inactive", "churned"],
      contract_status: [
        "draft",
        "sent",
        "signed",
        "active",
        "expired",
        "cancelled",
      ],
      deal_status: ["open", "won", "lost"],
      event_kind: ["meeting", "call", "task", "deadline", "other"],
      member_role: ["owner", "admin", "member", "viewer"],
      notification_kind: [
        "mention",
        "task_assigned",
        "task_due_soon",
        "task_completed",
        "deal_moved",
        "deal_won",
        "deal_lost",
        "deal_stale",
        "contract_expiring",
        "event_reminder",
        "message_received",
        "automation_failed",
      ],
      project_status: ["active", "on_hold", "done", "archived"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done", "cancelled"],
    },
  },
} as const

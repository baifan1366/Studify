export interface VideoEmbeddings {
    attachment_id: number;
    content_type: string; //profile, post, comment, course, lesson, auth_user
    embedding: number[];
    content_text: string;
    chunk_type?: string;
    hierarchy_level?: number;
    parent_chunk_id?: number;
    section_title?: string;
    semantic_density?: number;
    key_terms?: string[];
    sentence_count?: number;
    word_count?: number;
    has_code_block?: boolean;
    has_table?: boolean;
    has_list?: boolean;
    chunk_language?: string;
    embedding_model?: string;
    language?: string;
    token_count?: number;
    status?: string;
    error_message?: string;
    retry_count?: number;
    is_deleted?: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}
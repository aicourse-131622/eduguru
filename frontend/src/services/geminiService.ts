/**
 * Gemini AI Service for EduGuru (Frontend)
 * This now calls the backend API instead of Gemini directly
 * API Keys are stored securely on the server
 */

import { aiApi } from './apiService';

/**
 * Generate reflection for teaching journal
 */
export const generateReflection = async (
    objective: string,
    activities: string,
    studentEngagement: string
): Promise<string> => {
    try {
        const response = await aiApi.generateReflection(objective, activities, studentEngagement);
        return response.text || "Gagal menghasilkan refleksi.";
    } catch (error) {
        console.error("AI Error:", error);
        return "Terjadi kesalahan saat menghubungi AI.";
    }
};

/**
 * Suggest teaching methods for a topic
 */
export const suggestTeachingMethods = async (topic: string, grade: string): Promise<string> => {
    try {
        const response = await aiApi.suggestTeachingMethods(topic, grade);
        return response.text || "";
    } catch (error) {
        console.error("AI Error:", error);
        return "";
    }
};

/**
 * Generate follow-up plan for counseling
 */
export const generateFollowUpPlan = async (
    studentName: string,
    type: string,
    notes: string
): Promise<string> => {
    try {
        const response = await aiApi.generateFollowUp(studentName, type, notes);
        return response.text || "";
    } catch (error) {
        console.error("AI Error:", error);
        return "Gagal membuat RTL.";
    }
};

/**
 * Chat interface for AI assistant
 * Maintains conversation history for context
 */
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const sendChatMessage = async (
    message: string,
    history: ChatMessage[] = []
): Promise<string> => {
    try {
        const response = await aiApi.chat(message, history);
        return response.text || "Maaf, tidak ada respons dari AI.";
    } catch (error) {
        console.error("Chat AI Error:", error);
        throw new Error("Gagal menghubungi AI. Silakan coba lagi.");
    }
};

/**
 * Check if AI service is available
 */
export const isAIAvailable = async (): Promise<boolean> => {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        return data.ai === 'enabled';
    } catch {
        return false;
    }
};
import { useState, useEffect, useCallback } from 'react';
import type { Conversation, Feature, ChatMessage } from '../types';

const STORAGE_KEY = 'lumina-conversations';

export const useConversationManager = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        try {
            const storedConversations = localStorage.getItem(STORAGE_KEY);
            if (storedConversations) {
                const parsed = JSON.parse(storedConversations);
                // Sort by creation date, newest first
                parsed.sort((a: Conversation, b: Conversation) => b.createdAt - a.createdAt);
                setConversations(parsed);
            }
        } catch (error) {
            console.error("Failed to load conversations from localStorage", error);
        }
    }, []);

    const saveConversations = useCallback((newConversations: Conversation[]) => {
        try {
            // Sort by creation date, newest first
            newConversations.sort((a, b) => b.createdAt - a.createdAt);
            setConversations(newConversations);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConversations));
        } catch (error)
 {
            console.error("Failed to save conversations to localStorage", error);
        }
    }, []);

    const createConversation = useCallback((feature: Feature, modelId: string): Conversation => {
        const newConversation: Conversation = {
            id: `conv-${Date.now()}`,
            feature,
            messages: [],
            createdAt: Date.now(),
            modelId,
        };
        saveConversations([newConversation, ...conversations]);
        return newConversation;
    }, [conversations, saveConversations]);

    const updateConversation = useCallback((conversationId: string, messages: ChatMessage[]) => {
        const updatedConversations = conversations.map(c => 
            c.id === conversationId ? { ...c, messages } : c
        );
        saveConversations(updatedConversations);
    }, [conversations, saveConversations]);

    const deleteConversation = useCallback((conversationId: string, confirmMessage: string) => {
        if (window.confirm(confirmMessage)) {
            const filteredConversations = conversations.filter(c => c.id !== conversationId);
            saveConversations(filteredConversations);
        }
    }, [conversations, saveConversations]);

    const clearAllConversations = useCallback((confirmMessage: string) => {
        if (window.confirm(confirmMessage)) {
            saveConversations([]);
        }
    }, [saveConversations]);


    return { conversations, createConversation, updateConversation, deleteConversation, clearAllConversations };
};
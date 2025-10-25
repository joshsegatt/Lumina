import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversation, Feature, ChatMessage } from '../types';

const STORAGE_KEY = '@lumina:conversations';
const MAX_CONVERSATIONS = 100; // Prevent unbounded growth

export const useConversationManager = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadConversations = async () => {
            try {
                console.log('[ConversationManager] Loading conversations...');
                const storedConversations = await AsyncStorage.getItem(STORAGE_KEY);
                if (storedConversations) {
                    const parsed = JSON.parse(storedConversations);
                    // Sort by creation date, newest first
                    parsed.sort((a: Conversation, b: Conversation) => b.createdAt - a.createdAt);
                    console.log(`[ConversationManager] Loaded ${parsed.length} conversations`);
                    setConversations(parsed);
                } else {
                    console.log('[ConversationManager] No stored conversations found');
                }
            } catch (error: any) {
                console.error('[ConversationManager] ❌ Failed to load conversations:', error.message);
                // Don't throw - app should work even if storage fails
                setConversations([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadConversations();
    }, []);

    const saveConversations = useCallback(async (newConversations: Conversation[]) => {
        try {
            // Sort by creation date, newest first
            newConversations.sort((a, b) => b.createdAt - a.createdAt);
            
            // Enforce max conversation limit (LRU eviction)
            const trimmedConversations = newConversations.slice(0, MAX_CONVERSATIONS);
            if (trimmedConversations.length < newConversations.length) {
                console.warn(`[ConversationManager] Trimmed ${newConversations.length - trimmedConversations.length} old conversations (max: ${MAX_CONVERSATIONS})`);
            }
            
            setConversations(trimmedConversations);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedConversations));
            console.log(`[ConversationManager] ✅ Saved ${trimmedConversations.length} conversations`);
        } catch (error: any) {
            console.error('[ConversationManager] ❌ Failed to save conversations:', error.message);
            // Don't throw - update local state even if save fails
            setConversations(newConversations.slice(0, MAX_CONVERSATIONS));
        }
    }, []);

    const createConversation = useCallback((feature: Feature, modelId: string): Conversation => {
        const newConversation: Conversation = {
            id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
            feature,
            messages: [],
            createdAt: Date.now(),
            modelId,
        };
        console.log(`[ConversationManager] Creating conversation: ${newConversation.id}`);
        saveConversations([newConversation, ...conversations]);
        return newConversation;
    }, [conversations, saveConversations]);

    const updateConversation = useCallback((conversationId: string, messages: ChatMessage[]) => {
        const updatedConversations = conversations.map(c => 
            c.id === conversationId ? { ...c, messages } : c
        );
        console.log(`[ConversationManager] Updating conversation: ${conversationId} (${messages.length} messages)`);
        saveConversations(updatedConversations);
    }, [conversations, saveConversations]);

    const deleteConversation = useCallback(async (conversationId: string, confirmMessage: string, confirmFn: (message: string) => Promise<boolean>) => {
        const confirmed = await confirmFn(confirmMessage);
        if (confirmed) {
            const filteredConversations = conversations.filter(c => c.id !== conversationId);
            console.log(`[ConversationManager] Deleting conversation: ${conversationId}`);
            await saveConversations(filteredConversations);
        }
    }, [conversations, saveConversations]);

    const clearAllConversations = useCallback(async (confirmMessage: string, confirmFn: (message: string) => Promise<boolean>) => {
        const confirmed = await confirmFn(confirmMessage);
        if (confirmed) {
            console.log('[ConversationManager] Clearing all conversations');
            await saveConversations([]);
        }
    }, [saveConversations]);


    return { conversations, createConversation, updateConversation, deleteConversation, clearAllConversations, isLoading };
};
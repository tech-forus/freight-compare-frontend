// Centralized keyboard navigation hook for Tally-like form navigation
import { useCallback, useRef, useEffect } from 'react';

interface NavigationConfig {
    containerRef: React.RefObject<HTMLElement>;
    shipmentType: 'Heavy' | 'Light';
    boxCount: number;
    onAddBox: () => void;
    onCalculate: () => void;
}

// Field order generator based on shipment type and box count
const getFieldOrder = (shipmentType: 'Heavy' | 'Light', boxCount: number): string[] => {
    const fields: string[] = [
        'fromPincode',
        'toPincode',
        'invoiceValue',
    ];

    // Add box fields for each box
    for (let i = 0; i < boxCount; i++) {
        fields.push(`preset-${i}`);
        fields.push(`count-${i}`);

        if (shipmentType === 'Heavy') {
            fields.push(`weight-${i}`);
        } else {
            // Light mode: Weight, then L, W, H
            fields.push(`weight-light-${i}`);
            fields.push(`length-${i}`);
            fields.push(`width-${i}`);
            fields.push(`height-${i}`);
        }
    }

    fields.push('add-box-button');
    fields.push('calculate-button');

    return fields;
};

// Get focusable element by ID
const getFocusableElement = (id: string): HTMLElement | null => {
    return document.getElementById(id);
};

// Check if element is an input
const isInputElement = (el: HTMLElement): el is HTMLInputElement => {
    return el.tagName === 'INPUT';
};

// Check if element is a button
const isButtonElement = (el: HTMLElement): el is HTMLButtonElement => {
    return el.tagName === 'BUTTON';
};

export function useKeyboardNavigation({
    containerRef,
    shipmentType,
    boxCount,
    onAddBox,
    onCalculate,
}: NavigationConfig) {
    // Track backspace timing for double-backspace detection
    const lastBackspaceTime = useRef<number>(0);
    const lastBackspaceFieldId = useRef<string>('');
    const DOUBLE_BACKSPACE_THRESHOLD = 750; // ms

    // Get current field order
    const getFields = useCallback(() => {
        return getFieldOrder(shipmentType, boxCount);
    }, [shipmentType, boxCount]);

    // Find current field index
    const getCurrentFieldIndex = useCallback((fieldId: string): number => {
        const fields = getFields();
        return fields.indexOf(fieldId);
    }, [getFields]);

    // Focus next field
    const focusNextField = useCallback((currentId: string) => {
        const fields = getFields();
        const currentIndex = getCurrentFieldIndex(currentId);

        if (currentIndex === -1) return;

        // If at last field of a box row and it's the last box, create new box
        const isLastFieldOfBox = (id: string): boolean => {
            const match = id.match(/^(weight|height)-(\d+)$/);
            if (!match) return false;
            const [, fieldType, indexStr] = match;
            const index = parseInt(indexStr, 10);

            if (shipmentType === 'Heavy' && fieldType === 'weight') {
                return index === boxCount - 1;
            }
            if (shipmentType === 'Light' && fieldType === 'height') {
                return index === boxCount - 1;
            }
            return false;
        };

        // Check if we should add a new box (at last field of last box)
        if (isLastFieldOfBox(currentId)) {
            const nextIndex = currentIndex + 1;
            const nextId = fields[nextIndex];

            // If next is add-box-button, trigger add box and focus new box's first field
            if (nextId === 'add-box-button') {
                onAddBox();
                // Focus will be handled after state update via useEffect
                setTimeout(() => {
                    const newBoxFirstField = getFocusableElement(`preset-${boxCount}`);
                    if (newBoxFirstField) {
                        newBoxFirstField.focus();
                        if (isInputElement(newBoxFirstField)) {
                            newBoxFirstField.select();
                        }
                    }
                }, 50);
                return;
            }
        }

        // Normal forward navigation
        const nextIndex = currentIndex + 1;
        if (nextIndex < fields.length) {
            const nextId = fields[nextIndex];
            const nextElement = getFocusableElement(nextId);

            if (nextElement) {
                nextElement.focus();
                if (isInputElement(nextElement)) {
                    nextElement.select();
                }
            }
        }
    }, [getFields, getCurrentFieldIndex, shipmentType, boxCount, onAddBox]);

    // Focus previous field
    const focusPreviousField = useCallback((currentId: string) => {
        const fields = getFields();
        const currentIndex = getCurrentFieldIndex(currentId);

        if (currentIndex <= 0) return;

        const prevIndex = currentIndex - 1;
        const prevId = fields[prevIndex];
        const prevElement = getFocusableElement(prevId);

        if (prevElement) {
            prevElement.focus();
            if (isInputElement(prevElement)) {
                prevElement.select();
            }
        }
    }, [getFields, getCurrentFieldIndex]);

    // Handle double backspace
    const handleDoubleBackspace = useCallback((fieldId: string, isEmpty: boolean): boolean => {
        const now = Date.now();

        if (!isEmpty) {
            // Reset if field has content
            lastBackspaceTime.current = 0;
            lastBackspaceFieldId.current = '';
            return false;
        }

        if (lastBackspaceFieldId.current === fieldId &&
            now - lastBackspaceTime.current < DOUBLE_BACKSPACE_THRESHOLD) {
            // Double backspace detected
            lastBackspaceTime.current = 0;
            lastBackspaceFieldId.current = '';
            return true;
        }

        // First backspace on empty field
        lastBackspaceTime.current = now;
        lastBackspaceFieldId.current = fieldId;
        return false;
    }, []);

    // Main keydown handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const fieldId = target.id;

        // Skip if no ID or not in our field list
        if (!fieldId) return;

        const fields = getFields();
        if (!fields.includes(fieldId)) return;

        // Check if a dropdown is open (for pincode autocomplete)
        // const isDropdownOpen = document.querySelector('[aria-expanded="true"]') !== null;
        // const activeDropdown = target.getAttribute('aria-expanded') === 'true';

        switch (e.key) {
            case 'Tab':
                // Let Tab work naturally for forward, handle Shift+Tab for backward
                if (e.shiftKey) {
                    e.preventDefault();
                    focusPreviousField(fieldId);
                } else {
                    // Forward Tab
                    e.preventDefault();
                    focusNextField(fieldId);
                }
                break;

            case 'Enter':
                // Prevent form submission
                e.preventDefault();

                // If it's a button, activate it
                if (isButtonElement(target)) {
                    if (fieldId === 'add-box-button') {
                        onAddBox();
                        setTimeout(() => {
                            const newBoxFirstField = getFocusableElement(`preset-${boxCount}`);
                            if (newBoxFirstField) {
                                newBoxFirstField.focus();
                                if (isInputElement(newBoxFirstField)) {
                                    newBoxFirstField.select();
                                }
                            }
                        }, 50);
                    } else if (fieldId === 'calculate-button') {
                        onCalculate();
                    }
                    return;
                }

                // Removed dropdown check to allow "Select & Next" flow
                // if (activeDropdown || isDropdownOpen) { return; }

                // Move to next field
                focusNextField(fieldId);
                break;

            case 'Backspace':
                if (isInputElement(target)) {
                    const isEmpty = target.value === '';
                    if (handleDoubleBackspace(fieldId, isEmpty)) {
                        e.preventDefault();
                        focusPreviousField(fieldId);
                    }
                }
                break;

            case 'ArrowDown':
            case 'ArrowUp':
                // Let dropdowns handle arrow keys
                break;
        }
    }, [getFields, focusNextField, focusPreviousField, handleDoubleBackspace, onAddBox, onCalculate, boxCount]);

    // Attach global listener to container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [containerRef, handleKeyDown]);

    // Return utilities for manual control if needed
    return {
        focusNextField,
        focusPreviousField,
        getFieldOrder: getFields,
    };
}

export default useKeyboardNavigation;

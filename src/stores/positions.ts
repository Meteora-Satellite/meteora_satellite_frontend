import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { apiClient } from '@/services/api';
import type { ListPositionsResponseDataItemsInner, PositionDTO } from '@/api';

export const usePositionsStore = defineStore('positions', () => {
  const allPositions = ref<ListPositionsResponseDataItemsInner[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed property to check if user has any positions
  const hasPositions = computed(() => allPositions.value.length > 0);

  // Load all user positions
  async function loadAllPositions(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient.openApi.positions.positionsGet()
      if (response.ok) {
        allPositions.value = response.data.items;
      } else {
        error.value = 'Failed to load positions';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      allPositions.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Clear positions (e.g., on logout)
  function clearPositions(): void {
    allPositions.value = [];
    error.value = null;
  }

  // Add a new position to the list
  function addPosition(position: PositionDTO): void {
    allPositions.value.push(position);
  }

  // Remove a position from the list
  function removePosition(positionId: string): void {
    allPositions.value = allPositions.value.filter(p => p.id !== positionId);
  }

  // Update a position in the list
  function updatePosition(positionId: string, updatedPosition: PositionDTO): void {
    const index = allPositions.value.findIndex(p => p.id === positionId);
    if (index !== -1) {
      allPositions.value[index] = updatedPosition;
    }
  }

  return {
    // State
    allPositions,
    isLoading,
    error,

    // Computed
    hasPositions,

    // Actions
    loadAllPositions,
    clearPositions,
    addPosition,
    removePosition,
    updatePosition,
  };
});

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlanInput, StudyPlan } from '@/types'
import { STORAGE_KEYS } from '@/constants'
import { read, write } from '@/services/storage'
import { uid } from '@/utils/id'

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<StudyPlan[]>(read<StudyPlan[]>(STORAGE_KEYS.plans, []))

  function persist(): void {
    write(STORAGE_KEYS.plans, plans.value)
  }

  function addPlan(input: PlanInput): StudyPlan {
    const plan: StudyPlan = { ...input, id: uid(), createdAt: new Date().toISOString() }
    plans.value.unshift(plan)
    persist()
    return plan
  }

  function updatePlan(id: string, patch: Partial<StudyPlan>): void {
    const target = plans.value.find((p) => p.id === id)
    if (target) {
      Object.assign(target, patch)
      persist()
    }
  }

  function removePlan(id: string): void {
    plans.value = plans.value.filter((p) => p.id !== id)
    persist()
  }

  function toggleComplete(id: string): void {
    const target = plans.value.find((p) => p.id === id)
    if (!target) return
    target.completedAt = target.completedAt ? undefined : new Date().toISOString()
    persist()
  }

  /** 归档：仅在列表中隐藏，不删除数据，也不影响统计与成就 */
  function archivePlan(id: string): void {
    const target = plans.value.find((p) => p.id === id)
    if (!target || target.archivedAt) return
    target.archivedAt = new Date().toISOString()
    persist()
  }

  /** 从归档区恢复，重新显示在列表中（保留原完成状态） */
  function unarchivePlan(id: string): void {
    const target = plans.value.find((p) => p.id === id)
    if (!target) return
    target.archivedAt = undefined
    persist()
  }

  return {
    plans,
    addPlan,
    updatePlan,
    removePlan,
    toggleComplete,
    archivePlan,
    unarchivePlan,
  }
})
